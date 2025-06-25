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

    fun submitList(list: List<ResultItem>?) {
        // Clear the list first if null is passed
        if (list == null) {
            items = emptyList()
            notifyDataSetChanged()
            return
        }

        Log.d("ProfileAdapter", "Submitting list of ${list.size} items")
        list.forEachIndexed { index, item ->
            Log.d("ProfileAdapter", "Item $index: ${item.firstName} ${item.lastName} - ${item.practiceLocation}")
        }

        items = list.toList() // Create a new list to ensure immutability
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ProfileViewHolder {
        val view = LayoutInflater.from(parent.context).inflate(R.layout.item_profile, parent, false)
        return ProfileViewHolder(view)
    }

    override fun onBindViewHolder(holder: ProfileViewHolder, position: Int) {
        if (position < items.size) {
            val item = items[position]
            Log.d("ProfileAdapter", "Binding item at position $position: ${item.firstName} ${item.lastName}")
            holder.bind(item)
        }
    }

    override fun getItemCount(): Int = items.size

    override fun onViewRecycled(holder: ProfileViewHolder) {
        super.onViewRecycled(holder)
        holder.onViewRecycled()
    }

    inner class ProfileViewHolder(itemView: View) : RecyclerView.ViewHolder(itemView) {
        private val name = itemView.findViewById<TextView>(R.id.name_text)
        private val location = itemView.findViewById<TextView>(R.id.location_text)
        private val bookmarkBtn = itemView.findViewById<ImageButton>(R.id.bookmark_button)
        private val chipGroup = itemView.findViewById<ChipGroup>(R.id.status_chip_group)
        private val bookmarkRepo = BookmarkRepository(itemView.context)
        private var bookmarkJob: Job? = null
        private val viewHolderScope = CoroutineScope(Dispatchers.Main + Job())
        private var currentItem: ResultItem? = null

        fun bind(item: ResultItem) {
            // Cancel any previous bookmark job
            bookmarkJob?.cancel()

            // Store current item reference
            currentItem = item

            // Clear previous chips
            chipGroup.removeAllViews()

            // Set basic info
            val fullName = listOfNotNull(item.firstName, item.lastName)
                .joinToString(" ")
                .trim()
                .ifBlank { "Unknown RMT" }

            name.text = fullName
            location.text = item.practiceLocation?.takeIf { it.isNotBlank() } ?: "No location"

            Log.d("ProfileAdapter", "Binding: $fullName at ${item.practiceLocation}, authorized: ${item.authorizedToPractice}")

            // Authorized to Practice chip
            val authChip = Chip(itemView.context).apply {
                text = if (item.authorizedToPractice) "Authorized to Practice" else "Not Authorized"
                isClickable = false
                isCheckable = false
                setTextColor(android.graphics.Color.WHITE)
                chipBackgroundColor = android.content.res.ColorStateList.valueOf(
                    if (item.authorizedToPractice) 0xFF388E3C.toInt() else 0xFFD32F2F.toInt()
                )
            }
            chipGroup.addView(authChip)

            // Public Register Alert chip
            if (item.publicRegisterAlert) {
                val alertChip = Chip(itemView.context).apply {
                    text = "Public Register Alert"
                    isClickable = false
                    isCheckable = false
                    setTextColor(android.graphics.Color.WHITE)
                    chipBackgroundColor = android.content.res.ColorStateList.valueOf(0xFFD32F2F.toInt())
                }
                chipGroup.addView(alertChip)
            }

            // Observe bookmark state for this specific item
            bookmarkJob = viewHolderScope.launch {
                try {
                    bookmarkRepo.isBookmarked(item.profileId).collectLatest { isBookmarked ->
                        // Make sure we're still binding the same item
                        if (currentItem?.profileId == item.profileId) {
                            bookmarkBtn.setImageResource(
                                if (isBookmarked) R.drawable.ic_star_filled else R.drawable.ic_star_outline
                            )
                        }
                    }
                } catch (e: Exception) {
                    Log.e("ProfileAdapter", "Error observing bookmark state for ${item.profileId}", e)
                }
            }

            // Toggle bookmark on click
            bookmarkBtn.setOnClickListener {
                val itemToBookmark = currentItem
                if (itemToBookmark != null) {
                    viewHolderScope.launch {
                        try {
                            val isBookmarked = bookmarkRepo.isBookmarked(itemToBookmark.profileId).first()
                            if (isBookmarked) {
                                bookmarkRepo.removeBookmark(itemToBookmark.profileId)
                                Toast.makeText(itemView.context, "Removed from bookmarks", Toast.LENGTH_SHORT).show()
                            } else {
                                bookmarkRepo.addBookmark(itemToBookmark.profileId)
                                Toast.makeText(itemView.context, "Added to bookmarks", Toast.LENGTH_SHORT).show()
                            }
                        } catch (e: Exception) {
                            Log.e("ProfileAdapter", "Bookmark toggle failed for ${itemToBookmark.profileId}", e)
                            Toast.makeText(itemView.context, "Bookmark error: ${e.message}", Toast.LENGTH_LONG).show()
                        }
                    }
                }
            }

            // Set click listener for the entire item
            itemView.setOnClickListener {
                currentItem?.let { onClick(it) }
            }
        }

        fun onViewRecycled() {
            bookmarkJob?.cancel()
            currentItem = null
            // Don't cancel the entire scope, just the current job
        }
    }
}