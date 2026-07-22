import mongoose, { type InferSchemaType, type Model } from "mongoose";

const productLocaleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    ingredients: {
      type: String,
      required: [true, "Ingredients are required"],
      trim: true,
    },
    keyBenefits: {
      type: String,
      required: [true, "Key benefits are required"],
      trim: true,
    },
    safetyNotes: {
      type: String,
      required: [true, "Safety notes are required"],
      trim: true,
    },
    howToUse: {
      type: String,
      required: [true, "How to use is required"],
      trim: true,
    },
  },
  { _id: false },
);

const productSchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: [true, "Slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    productType: {
      type: String,
      enum: ["single", "kit"],
      default: "single",
      required: [true, "Product type is required"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be zero or greater"],
    },
    sizeMl: {
      type: Number,
      min: [1, "Size must be at least 1 ml"],
    },
    kitSize: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["in_stock", "low_stock"],
      default: "in_stock",
    },
    images: {
      type: [String],
      default: ["/hero-img.png"],
    },
    videos: {
      type: [String],
      default: [],
    },
    translations: {
      en: {
        type: productLocaleSchema,
        required: [true, "English content is required"],
      },
      de: {
        type: productLocaleSchema,
        required: [true, "German content is required"],
      },
      ar: {
        type: productLocaleSchema,
        required: [true, "Arabic content is required"],
      },
    },
  },
  {
    timestamps: true,
  },
);

export type ProductLocaleDocument = InferSchemaType<typeof productLocaleSchema>;
export type ProductDocument = InferSchemaType<typeof productSchema> & {
  _id: mongoose.Types.ObjectId;
};

const existingProductModel = mongoose.models.Product as
  | Model<ProductDocument>
  | undefined;

// Next.js HMR can keep a Product model compiled before `videos` existed.
// Without this, saves silently drop videos under mongoose strict mode,
// and GET responses omit videos even when they exist in MongoDB.
if (existingProductModel && !existingProductModel.schema.path("videos")) {
  delete mongoose.models.Product;
  delete mongoose.connection.models.Product;
}

const Product =
  (mongoose.models.Product as Model<ProductDocument> | undefined) ??
  mongoose.model<ProductDocument>("Product", productSchema);

export default Product;
