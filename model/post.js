import { Schema, model } from "mongoose";

const postSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    cover: {
      type: String,
      required: false,
    },
    author: {
      type: String,
      required: true,
    },
    likes: {
      type: [String],
      default: [],
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

export const postModel = model("Post", postSchema);
