#!/usr/bin/env python3
"""
Run Gemini meta-analysis to generate RMT leaderboard stats from all review analyses.
Saves input/output JSON to disk and stores results in rmt_leaderboard table.
"""
import argparse
import json
import logging
import os
import sqlite3
import time
from datetime import datetime
from typing import Dict, Any, List

import google.generativeai as genai

from gemini_review_analyzer import GeminiReviewAnalyzer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

DB_PATH = "rmt_monitoring.db"

LEADERBOARD_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS rmt_leaderboard (
    profile_id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    meta_leaderboard_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    PRIMARY KEY (profile_id, run_id),
    FOREIGN KEY (profile_id) REFERENCES rmt_profiles(profile_id)
);
"""

META_LEADERBOARD_RUNS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS meta_leaderboard_runs (
    run_id TEXT PRIMARY KEY,
    input_json TEXT NOT NULL,
    output_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL
);
"""

def ensure_tables(db_path: str):
    with sqlite3.connect(db_path) as conn:
        conn.execute(LEADERBOARD_TABLE_SQL)
        conn.execute(META_LEADERBOARD_RUNS_TABLE_SQL)


def aggregate_analyses(db_path: str) -> Dict[str, Any]:
    """Aggregate all review analyses per RMT from the database."""
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        # Get all RMTs
        rmts = conn.execute("SELECT profile_id, first_name, last_name FROM rmt_profiles").fetchall()
        # Get all analyses
        analyses = conn.execute("SELECT * FROM ai_analyses").fetchall()
    # Group analyses by profile_id
    rmt_map = {r['profile_id']: {
        'profile_id': r['profile_id'],
        'name': f"{r['first_name']} {r['last_name']}",
        'analyses': []
    } for r in rmts}
    for a in analyses:
        pid = a['profile_id']
        if pid in rmt_map:
            try:
                analysis_json = json.loads(a['analysis_json'])
            except Exception:
                analysis_json = a['analysis_json']
            rmt_map[pid]['analyses'].append(analysis_json)
    return {'RMTs': list(rmt_map.values())}


def save_json(obj: Any, prefix: str) -> str:
    ts = int(time.time())
    fname = f"{prefix}_{ts}.json"
    with open(fname, 'w') as f:
        json.dump(obj, f, indent=2, default=str)
    logger.info(f"Saved {prefix} JSON to {fname}")
    return fname


def run_gemini_meta_analysis(gemini_api_key: str, input_json: Dict[str, Any]) -> Dict[str, Any]:
    # Build the prompt with the input JSON appended at the end
    prompt = (
        "You are an expert in healthcare reputation analysis. Below is a JSON object containing "
        "AI-generated review analyses (you had generated these analyses) for several Registered Massage Therapists (RMTs). Each analysis includes "
        "sentiment, service quality, professionalism, and authenticity metrics.\n\n"
        "For each RMT:\n"
        "- Aggregate the analyses.\n"
        "- Assign scores (0-100) for these dimensions: Sentiment, Service Quality, Communication, Professionalism, "
        "Authenticity, Recommendation Rate, Repeat Client Rate, and any other relevant facet you find.\n"
        "- Calculate an overall composite score (0-100).\n"
        "- Rank all RMTs from best to worst.\n"
        "- For each RMT, provide a brief summary of their strengths and weaknesses.\n\n"
        "Output JSON format:\n"
        "{\n  'leaderboard': [\n    {\n      'profile_id': '...',\n      'name': '...',\n      'scores': { ... },\n      'rank': 1,\n      'summary': '...'\n    }, ...\n  ]\n}\n"
        "Example output:\n"
        "{\n"
        "  \"leaderboard\": [\n"
        "    {\n"
        "      \"profile_id\": \"123\",\n"
        "      \"name\": \"Jane Doe\",\n"
        "      \"scores\": {\n"
        "        \"sentiment\": 92,\n"
        "        \"service_quality\": 88,\n"
        "        \"communication\": 85,\n"
        "        \"professionalism\": 90,\n"
        "        \"authenticity\": 95,\n"
        "        \"recommendation_rate\": 80,\n"
        "        \"repeat_client_rate\": 70,\n"
        "        \"composite\": 90\n"
        "      },\n"
        "      \"rank\": 1,\n"
        "      \"summary\": \"Jane Doe is highly rated for professionalism and authenticity, with strong client recommendations.\"\n"
        "    },\n"
        "    ...\n"
        "  ]\n"
        "}\n"
        "\nHere is the input JSON for all RMTs and their analyses:\n"
        f"{json.dumps(input_json, indent=2)}"
    )
    # Use Gemini to generate the leaderboard
    logger.info("Sending meta-analysis prompt to Gemini...")
    genai.configure(api_key=gemini_api_key)
    model = genai.GenerativeModel('gemini-2.5-flash-preview-04-17')
    response = model.generate_content(prompt)
    # Parse response
    if hasattr(response, 'text'):
        try:
            output_json = json.loads(response.text)
        except Exception:
            output_json = {'raw': response.text}
    else:
        output_json = response
    logger.info("Received meta-analysis output from Gemini.")
    return output_json


def store_meta_leaderboard(db_path: str, run_id: str, leaderboard: List[Dict[str, Any]]):
    with sqlite3.connect(db_path) as conn:
        for entry in leaderboard:
            conn.execute(
                """
                INSERT OR REPLACE INTO rmt_leaderboard (profile_id, run_id, meta_leaderboard_json, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (
                    entry['profile_id'],
                    run_id,
                    json.dumps(entry, default=str),
                    datetime.now()
                )
            )


def store_meta_leaderboard_run(db_path: str, run_id: str, input_json: Any, output_json: Any):
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            """
            INSERT INTO meta_leaderboard_runs (run_id, input_json, output_json, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (
                run_id,
                json.dumps(input_json, default=str),
                json.dumps(output_json, default=str),
                datetime.now()
            )
        )


def main():
    parser = argparse.ArgumentParser(description='Run Gemini meta-analysis leaderboard')
    parser.add_argument('--gemini-api-key', required=True, help='Gemini API key')
    parser.add_argument('--db-path', default=DB_PATH, help='Database file path')
    args = parser.parse_args()

    ensure_tables(args.db_path)

    # Aggregate all analyses
    logger.info("Aggregating all Gemini review analyses per RMT...")
    input_json = aggregate_analyses(args.db_path)
    run_id = f"meta_{int(time.time())}"

    # Save input JSON
    input_json_file = save_json(input_json, f"meta_leaderboard_input_{run_id}")

    # Run Gemini meta-analysis
    output_json = run_gemini_meta_analysis(args.gemini_api_key, input_json)

    # Save output JSON
    output_json_file = save_json(output_json, f"meta_leaderboard_output_{run_id}")

    # Store meta leaderboard in DB
    leaderboard = output_json.get('leaderboard', [])
    store_meta_leaderboard(args.db_path, run_id, leaderboard)
    store_meta_leaderboard_run(args.db_path, run_id, input_json, output_json)

    logger.info(f"Meta leaderboard run complete. Run ID: {run_id}")
    logger.info(f"Input JSON: {input_json_file}")
    logger.info(f"Output JSON: {output_json_file}")

if __name__ == "__main__":
    main() 