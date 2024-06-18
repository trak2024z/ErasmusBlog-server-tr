const { Schema, model } = require("mongoose");

const postSchema = new Schema({
    title: {type: String, required: true},
    category: {type: String, enum:['Agriculture', 'Business', 'Education', 'Entertainment', 'Art', 'Investment', 'Weather'], message: "{VALUE IS NOT SUPPORTED}"},
    description: {type: String, required: true},
    creator: {type: Schema.Types.ObjectId, ref: "User"},
    title: {type: String, required: true},
    thumbnail: {type: String, required: true},
}, {timestamps: true})

module.exports = model("Post", postSchema)