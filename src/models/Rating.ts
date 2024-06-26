import mongoose from "mongoose";

interface IRating extends mongoose.Document {
  rating: number;
  feedback: string;

  userId: mongoose.Schema.Types.ObjectId;
}

const RatingSchema = new mongoose.Schema<IRating>(
  {
    rating: {
      type: Number,
      required: [true, "Please enter your rating"],
    },
    feedback: {
      type: String,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Rating", RatingSchema);
