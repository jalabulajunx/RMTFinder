package com.example.rmtfinder

import android.app.AlertDialog
import android.app.Application
import android.os.Handler
import android.os.Looper
import android.widget.ScrollView
import android.widget.TextView

class RMTFinderApp : Application() {
    override fun onCreate() {
        super.onCreate()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            val stackTrace = throwable.stackTraceToString()
            Handler(Looper.getMainLooper()).post {
                val textView = TextView(this).apply {
                    text = "${throwable.message}\n\n$stackTrace"
                    setTextIsSelectable(true)
                    setPadding(32, 32, 32, 32)
                }
                val scrollView = ScrollView(this).apply {
                    addView(textView)
                }
                AlertDialog.Builder(this)
                    .setTitle("App Crash - Copy and Share This Log")
                    .setView(scrollView)
                    .setCancelable(false)
                    .setPositiveButton("Close") { _, _ ->
                        android.os.Process.killProcess(android.os.Process.myPid())
                        System.exit(1)
                    }
                    .show()
            }
        }
    }
} 