package com.example.rmtfinder.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.ImageButton
import androidx.recyclerview.widget.RecyclerView
import com.example.rmtfinder.R
import com.example.rmtfinder.model.ResultItem
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup

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

            // Status chips
            val chipGroup = itemView.findViewById<ChipGroup>(R.id.status_chip_group)
            chipGroup.removeAllViews()

            // Authorized to Practice chip
            val authChip = Chip(itemView.context)
            authChip.text = if (item.authorizedToPractice) "Authorized to Practice" else "Not Authorized"
            authChip.isClickable = false
            authChip.isCheckable = false
            authChip.setTextColor(android.graphics.Color.WHITE)
            authChip.chipBackgroundColor = android.content.res.ColorStateList.valueOf(
                if (item.authorizedToPractice) 0xFF388E3C.toInt() else 0xFFD32F2F.toInt()
            )
            chipGroup.addView(authChip)

            // Public Register Alert chip
            if (item.publicRegisterAlert) {
                val alertChip = Chip(itemView.context)
                alertChip.text = "Public Register Alert"
                alertChip.isClickable = false
                alertChip.isCheckable = false
                alertChip.setTextColor(android.graphics.Color.WHITE)
                alertChip.chipBackgroundColor = android.content.res.ColorStateList.valueOf(0xFFD32F2F.toInt())
                chipGroup.addView(alertChip)
            }

            // Bookmark icon
            val bookmarkBtn = itemView.findViewById<ImageButton>(R.id.bookmark_button)
            val isBookmarked = BookmarkManager.isBookmarked(itemView.context, item.profileId)
            bookmarkBtn.setImageResource(
                if (isBookmarked) R.drawable.ic_star_filled else R.drawable.ic_star_outline
            )
            bookmarkBtn.setOnClickListener {
                BookmarkManager.toggleBookmark(itemView.context, item.profileId)
                notifyItemChanged(adapterPosition)
            }

            itemView.setOnClickListener { onClick(item) }
        }
    }
}
