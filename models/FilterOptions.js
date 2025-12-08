import mongoose from "mongoose";

const priceRangeSchema = new mongoose.Schema({
  label: { type: String, required: true },
  min: { type: Number, required: true },
  max: { type: Number, required: true }
}, { _id: false });

const filterOptionsSchema = new mongoose.Schema(
  {
    categories: { type: [String], default: [] },
    brands: { type: [String], default: [] },
    priceRanges: { type: [priceRangeSchema], default: [] }
  },
  { timestamps: true }
);

const FilterOptions = mongoose.model("FilterOptions", filterOptionsSchema);
export default FilterOptions;
