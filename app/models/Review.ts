import mongoose, { type InferSchemaType, type Model } from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },
    productName: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    comment: {
      type: String,
      required: [true, "Comment is required"],
      trim: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating must be at most 5"],
    },
  },
  {
    timestamps: true,
  },
);

export type ReviewDocument = InferSchemaType<typeof reviewSchema> & {
  _id: mongoose.Types.ObjectId;
};

// Drop a stale compiled model so schema changes (e.g. productName) apply in dev.
if (mongoose.models.Review) {
  delete mongoose.models.Review;
}

const Review = mongoose.model<ReviewDocument>("Review", reviewSchema);

export default Review;
