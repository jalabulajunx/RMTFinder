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
import android.util.Log
import android.widget.Toast
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.first

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
        private val bookmarkBtn = itemView.findViewById<ImageButton>(R.id.bookmark_button)
        private val bookmarkRepo = BookmarkRepository(itemView.context)
        private var bookmarkJob: Job? = null
        private val viewHolderScope = CoroutineScope(Dispatchers.Main)

        fun bind(item: ResultItem) {
            name.text = listOfNotNull(item.firstName, item.lastName).joinToString(" ").ifBlank { "Unknown RMT" }
            location.text = item.practiceLocation?.takeIf { it.isNotBlank() } ?: "No location"

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

            // Cancel previous Flow collection
            bookmarkJob?.cancel()
            // Observe bookmark state
            bookmarkJob = viewHolderScope.launch {
                bookmarkRepo.isBookmarked(item.profileId).collectLatest { isBookmarked ->
                    bookmarkBtn.setImageResource(
                        if (isBookmarked) R.drawable.ic_star_filled else R.drawable.ic_star_outline
                    )
                }
            }
            // Toggle bookmark on click
            bookmarkBtn.setOnClickListener {
                viewHolderScope.launch {
                    try {
                        val isBookmarked = bookmarkRepo.isBookmarked(item.profileId)
                            .first()
                        if (isBookmarked) {
                            bookmarkRepo.removeBookmark(item.profileId)
                        } else {
                            bookmarkRepo.addBookmark(item.profileId)
                        }
                    } catch (e: Exception) {
                        Log.e("ProfileAdapter", "Bookmark toggle failed", e)
                        Toast.makeText(itemView.context, "Bookmark error: ${e.message}", Toast.LENGTH_LONG).show()
                    }
                }
            }
            itemView.setOnClickListener { onClick(item) }
        }
        fun onViewRecycled() {
            bookmarkJob?.cancel()
            viewHolderScope.cancel()
        }
    }
}
