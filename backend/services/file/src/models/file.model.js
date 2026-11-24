import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File",
      default: null,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["folder", "file"],
      required: true,
    },
    extension: {
      type: String,
      default: "",
    },
    language: {
      type: String,
      default: "plaintext",
    },
    content: {
      type: String,
      default: "",
    },
    // "utf8" for text, "base64" for binary payloads kept in `content`.
    encoding: {
      type: String,
      enum: ["utf8", "base64"],
      default: "utf8",
    },
    contentType: {
      type: String,
      default: "",
    },
    size: {
      type: Number,
      default: 0,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
    // Every node removed by one delete action shares a batch id, so the whole
    // subtree can be restored as a single undo.
    deletedBatch: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

fileSchema.index(
  { projectId: 1, parentId: 1, name: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

fileSchema.index({ owner: 1, deletedBatch: 1 });

const File = mongoose.model("File", fileSchema);
export default File;
