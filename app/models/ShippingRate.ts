import mongoose, { type InferSchemaType, type Model } from "mongoose";

const shippingRateSchema = new mongoose.Schema(
  {
    country: {
      type: String,
      required: [true, "Country is required"],
      unique: true,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Shipping price is required"],
      min: [0, "Shipping price must be zero or greater"],
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export type ShippingRateDocument = InferSchemaType<typeof shippingRateSchema> & {
  _id: mongoose.Types.ObjectId;
};

const ShippingRate =
  (mongoose.models.ShippingRate as Model<ShippingRateDocument> | undefined) ??
  mongoose.model<ShippingRateDocument>("ShippingRate", shippingRateSchema);

export default ShippingRate;
