import mongoose, { type InferSchemaType, type Model } from "mongoose";

const orderProductSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: [true, "Product slug is required"],
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    price: {
      type: String,
      required: [true, "Product price is required"],
      trim: true,
    },
    image: {
      type: String,
      required: [true, "Product image is required"],
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, "Product quantity is required"],
      min: [1, "Product quantity must be at least 1"],
    },
  },
  { _id: false },
);

const orderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    streetAddress: {
      type: String,
      required: [true, "Street address is required"],
      trim: true,
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },
    stateProvince: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },
    zipPostalCode: {
      type: String,
      required: [true, "Zip/Postal code is required"],
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "online", "paypal"],
      required: [true, "Payment method is required"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be zero or greater"],
    },
    shippingFee: {
      type: Number,
      required: [true, "Shipping fee is required"],
      min: [0, "Shipping fee must be zero or greater"],
      default: 0,
    },
    products: {
      type: [orderProductSchema],
      required: [true, "Products are required"],
      validate: {
        validator: (value: unknown[]) =>
          Array.isArray(value) && value.length > 0,
        message: "At least one product is required.",
      },
    },
    total: {
      type: Number,
      required: [true, "Total is required"],
      min: [0, "Total must be zero or greater"],
    },
    orderPlaceTime: {
      type: Date,
      required: [true, "Order place time is required"],
      default: Date.now,
    },
    orderTime: {
      type: Date,
      required: [true, "Order time is required"],
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
    stripeSessionId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      default: undefined,
    },
    paypalOrderId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      default: undefined,
    },
    paypalCaptureId: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      default: undefined,
    },
  },
  {
    timestamps: true,
  },
);

export type OrderProduct = InferSchemaType<typeof orderProductSchema>;
export type OrderDocument = InferSchemaType<typeof orderSchema> & {
  _id: mongoose.Types.ObjectId;
};

const Order =
  (mongoose.models.Order as Model<OrderDocument> | undefined) ??
  mongoose.model<OrderDocument>("Order", orderSchema);

export default Order;
