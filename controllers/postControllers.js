const Post = require("../models/postModel")
const User = require("../models/userModel")
const path = require('path')
const fs = require('fs')
const {v4: uuid} = require('uuid')
const HttpError = require('../models/errorModel')



// GET ALL POSTS
// GET: api/posts
// UNPROTECTED
const getPosts = async (req,res,next) => {
    try {
        const posts = await Post.find().sort({updateAt: -1})
        res.status(200).json(posts)
    } catch (error) {
        return next(new HttpError("Something wrong", 404));
    }
}





// GET SINGLE POST
// GET: api/posts/:id
// UNPROTECTED
const getPost = async (req,res,next) => {
    try {
        const postId = req.params.id;
        const post = await Post.findById(postId)
        if (!post) {
            return next(new HttpError("Post not found", 404));
        }
        res.status(200).json(post)
    } catch (error) {
        return next(new HttpError("Something wrong", 404));
    }
}







// GET POSTS BY CATEGORY
// GET: api/posts/categories/:category
// UNPROTECTED
const getCatPost = async(req,res,next) => {
    try {
        const {category} = req.params;
        const catPosts = await Post.find({category}).sort({createdAt: -1})
        res.status(200).json(catPosts)
    } catch (error) {
        return next(new HttpError("Something wrong", 404));
    }
}







// GET AUTHOR POST
// GET: api/posts/users/:id
// UNPROTECTED
const getUserPost = async(req,res,next) => {
    try {
        const {id} = req.params;
        const posts = await Post.find({creator: id}).sort({createdAt: -1})
        res.status(200).json(posts)
    } catch (error) {
        return next(new HttpError("Something wrong", 404));
    }
}







// POST CREATE POST
// GET: api/posts/users/:id
// UNPROTECTED
const createPost = (req, res, next) => {
    try {
        const { title, category, description } = req.body;
        if (!title || !category || !description || !req.files || !req.files.thumbnail) {
            return next(new HttpError("Fill all data and choose thumbnail", 422));
        }

        const { thumbnail } = req.files;
        if (thumbnail.size > 4000000) {
            return next(new HttpError("Thumbnail is too big", 422));
        }

        let fileName = thumbnail.name;
        let splittedFilename = fileName.split('.');
        let newFileName = splittedFilename[0] + uuid() + "." + splittedFilename[splittedFilename.length - 1];

        thumbnail.mv(path.join(__dirname, "..", "uploads", newFileName), async (err) => {
            if (err) {
                return next(new HttpError("File move failed", 500));
            } else {
                const newPost = await Post.create({
                    title,
                    category,
                    description,
                    thumbnail: newFileName,
                    creator: req.user.id
                });

                if (!newPost) {
                    return next(new HttpError("Post couldn't be created", 422));
                }

                const currentUser = await User.findById(req.user.id);
                const userPostCount = currentUser.posts + 1;
                await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });

                res.status(201).json(newPost);
            }
        });
    } catch (error) {
        return next(new HttpError("Something went wrong", 500));
    }
};





// DELETE POST
// GET: api/posts/users/:id
// UNPROTECTED
const deletePost = async (req, res, next) => {
    try {
        const postId = req.params.id;
        if (!postId) {
            return next(new HttpError("Post unavailable", 500));
        }

        const post = await Post.findById(postId);
        if (!post) {
            return next(new HttpError("Post not found", 404));
        }

        if (req.user.id !== post.creator.toString()) {
            return next(new HttpError("Not authorized to delete this post", 403));
        }

        const fileName = post.thumbnail;
        fs.unlink(path.join(__dirname, '..', 'uploads', fileName), async (err) => {
            if (err) {
                return next(new HttpError("Failed to delete thumbnail", 500));
            }

            await Post.findByIdAndDelete(postId);

            const currentUser = await User.findById(req.user.id);
            if (currentUser) {
                const userPostCount = currentUser.posts - 1;
                await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });
            }

            res.status(200).json({ message: `Post ${postId} deleted successfully` });
        });
    } catch (error) {
        return next(new HttpError("Something went wrong", 500));
    }
};





// PATCH POST
// GET: api/posts/users/:id
// UNPROTECTED
const editPost = async (req, res, next) => {
    try {
        const postId = req.params.id;
        const { title, category, description } = req.body;

        if (!title || !category || description.length < 12) {
            return next(new HttpError("Fill all data", 422));
        }

        let updatedPost;
        if (!req.files || !req.files.thumbnail) {
            // Обновление без изменения миниатюры
            updatedPost = await Post.findByIdAndUpdate(postId, { title, category, description }, { new: true });
        } else {
            // Обновление с изменением миниатюры
            const oldPost = await Post.findById(postId);
            if (!oldPost) {
                return next(new HttpError("Post not found", 404));
            }

            const { thumbnail } = req.files;
            if (thumbnail.size > 4000000) {
                return next(new HttpError("Image too big, should be not bigger than 2 MB", 422));
            }

            // Удаление старого файла
            fs.unlink(path.join(__dirname, '..', 'uploads', oldPost.thumbnail), async (err) => {
                if (err) {
                    return next(new HttpError("Failed to delete old thumbnail", 500));
                }
            });

            const fileName = thumbnail.name;
            const splittedFilename = fileName.split('.');
            const newFileName = splittedFilename[0] + uuid() + "." + splittedFilename[splittedFilename.length - 1];

            // Перемещение нового файла
            thumbnail.mv(path.join(__dirname, '..', 'uploads', newFileName), async (err) => {
                if (err) {
                    return next(new HttpError("Failed to move new thumbnail", 500));
                }

                updatedPost = await Post.findByIdAndUpdate(postId, { title, category, description, thumbnail: newFileName }, { new: true });
                if (!updatedPost) {
                    return next(new HttpError("Couldn't update post", 400));
                }

                res.status(200).json(updatedPost);
            });

            return; // Завершение функции, чтобы избежать повторного ответа
        }

        if (!updatedPost) {
            return next(new HttpError("Couldn't update post", 400));
        }

        res.status(200).json(updatedPost);
    } catch (error) {
        return next(new HttpError("Something went wrong", 500));
    }
};


module.exports = {
    getPosts,
    getPost,
    getCatPost,
    getUserPost,
    createPost,
    deletePost,
    editPost
}