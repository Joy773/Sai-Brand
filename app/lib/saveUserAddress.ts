import mongoose from "mongoose";
import { connectDB } from "@/app/lib/mongodb";
import type { UserAddress } from "@/app/models/User";
import User from "@/app/models/User";

export type UserAddressInput = {
  firstName?: string;
  lastName?: string;
  streetAddress: string;
  country: string;
  stateProvince?: string;
  city: string;
  zipPostalCode: string;
  phoneNumber: string;
};

export function toUserAddress(input: UserAddressInput): UserAddress {
  return {
    firstName: input.firstName?.trim() ?? "",
    lastName: input.lastName?.trim() ?? "",
    streetAddress: input.streetAddress.trim(),
    country: input.country.trim(),
    stateProvince: input.stateProvince?.trim() ?? "",
    city: input.city.trim(),
    zipPostalCode: input.zipPostalCode.trim(),
    phoneNumber: input.phoneNumber.trim(),
  };
}

export function hasAddressContent(
  address?: UserAddress | UserAddressInput | null,
): boolean {
  if (!address) {
    return false;
  }

  return Boolean(
    address.streetAddress?.trim() ||
      address.country?.trim() ||
      address.city?.trim() ||
      address.zipPostalCode?.trim() ||
      address.phoneNumber?.trim() ||
      address.stateProvince?.trim() ||
      address.firstName?.trim() ||
      address.lastName?.trim(),
  );
}

type SaveUserAddressOptions = {
  userId?: string | null;
  role?: string | null;
};

export async function saveUserAddress(
  email: string,
  input: UserAddressInput,
  options: SaveUserAddressOptions = {},
) {
  // Admin accounts are env-based and do not exist in the users collection.
  if (options.role === "admin" || options.userId === "admin") {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const userId = options.userId?.trim() || "";

  if (!normalizedEmail && !userId) {
    return null;
  }

  await connectDB();

  const address = toUserAddress(input);

  const filter =
    userId && mongoose.Types.ObjectId.isValid(userId)
      ? { _id: new mongoose.Types.ObjectId(userId) }
      : { email: normalizedEmail };

  const updatedUser = await User.findOneAndUpdate(
    filter,
    { $set: { address } },
    { returnDocument: "after" },
  );

  if (updatedUser) {
    return updatedUser;
  }

  // Fallback: email lookup if id lookup missed (or vice versa).
  if (userId && normalizedEmail) {
    const byEmail = await User.findOneAndUpdate(
      { email: normalizedEmail },
      { $set: { address } },
      { returnDocument: "after" },
    );

    if (byEmail) {
      return byEmail;
    }
  }

  console.warn(
    `[saveUserAddress] No user found for ${
      userId ? `id=${userId}` : ""
    }${userId && normalizedEmail ? " / " : ""}${
      normalizedEmail ? `email=${normalizedEmail}` : ""
    }`,
  );

  return null;
}
