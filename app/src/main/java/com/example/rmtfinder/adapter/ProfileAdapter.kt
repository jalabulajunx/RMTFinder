package com.example.rmtfinder.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import com.example.rmtfinder.R
import com.example.rmtfinder.model.ResultItem

class ProfileAdapter(
    private val onClick: (ResultItem) -> Unit
) : RecyclerView.Adapter<ProfileAdapter.ProfileViewHolder>() {

    private var items: List<ResultItem> = emptyList()

    fun submitList(list: List<ResultItem>) {
        items = list
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ProfileViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_profile, parent, false)
        return ProfileViewHolder(view)
    }

    override fun onBindViewHolder(holder: ProfileViewHolder, position: Int) {
        holder.bind(items[position])
    }

    override fun getItemCount(): Int = items.size

    inner class ProfileViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val name = itemView.findViewById<TextView>(R.id.name_text)
        private val location = itemView.findViewById<TextView>(R.id.location_text)

        fun bind(item: ResultItem) {
            name.text = "${item.firstName} ${item.lastName}"
            location.text = item.practiceLocation ?: "No location"
            itemView.setOnClickListener { onClick(item) }
        }
    }
}
