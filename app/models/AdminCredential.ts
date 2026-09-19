import mongoose, { type InferSchemaType, type Model } from "mongoose";

const adminCredentialSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "admin",
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

export type AdminCredentialDocument = InferSchemaType<
  typeof adminCredentialSchema
> & {
  _id: mongoose.Types.ObjectId;
};

const AdminCredential =
  (mongoose.models.AdminCredential as
    | Model<AdminCredentialDocument>
    | undefined) ??
  mongoose.model<AdminCredentialDocument>(
    "AdminCredential",
    adminCredentialSchema,
  );

export default AdminCredential;
