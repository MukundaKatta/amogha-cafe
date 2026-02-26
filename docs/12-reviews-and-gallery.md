# Reviews & Gallery

**File:** `src/modules/features.js`

---

## Reviews

### Customer-Facing

The Reviews section on the main page shows:

- **Overall rating** — average star rating across all reviews
- **Star breakdown** — bar chart showing count per star level (1–5)
- **Review cards** — each showing:
  - Customer name
  - Star rating (visual stars)
  - Review text
  - Date posted

**"Write a Review" button** — visible to all, but requires login to submit.

### Submitting a Review

1. Customer clicks "Write a Review"
2. If not signed in → prompted to sign in first
3. Review modal opens:

| Field | Notes |
|-------|-------|
| Star rating | Click to select 1–5 stars |
| Review text | Required, min ~10 characters |
| Submit | Saves to Firestore |

4. On submit:
   - Review saved to `reviews` collection
   - Page reloads the reviews section to show the new entry
   - **Reviews are immutable** — Firestore rules prevent any edits or deletes after submission. Contact Firebase Console to remove a review if needed.

### Review Document in Firestore

```json
{
  "id": "auto-generated",
  "userId": "firebase uid",
  "userName": "Customer Name",
  "rating": 5,
  "text": "Amazing biryani! The chicken was perfectly cooked.",
  "createdAt": "timestamp"
}
```

### Menu Item Ratings

Individual menu item cards also show their average rating. This is loaded from `reviews` collection, filtered by `itemName`, and averaged. Shown below the item name on the card.

---

## Gallery

### Customer-Facing

The Gallery section displays a **masonry photo grid** of food photos and restaurant images.

- Images are loaded from Firestore `socialPosts` collection
- Clicking any image opens a **full-screen lightbox**
- Lightbox controls:
  - ← / → keyboard arrows to navigate between images
  - Click backdrop or × button to close
  - Caption shown below the image

### Social Posts Document in Firestore

```json
{
  "id": "auto-generated",
  "imageUrl": "https://firebasestorage.../photo.jpg",
  "caption": "Our famous Chicken Biryani!",
  "createdAt": "timestamp"
}
```

### Adding Photos (Admin)

From Admin Dashboard → Content → Social Posts:
1. Click "Add Photo"
2. Upload image (stored in Firebase Storage)
3. Add caption
4. Save → appears in gallery immediately
