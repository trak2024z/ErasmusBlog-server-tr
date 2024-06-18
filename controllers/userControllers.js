const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const HttpError = require("../models/errorModel");
const jwt = require('jsonwebtoken')
const fs = require('fs')
const path = require('path')
const {v4: uuid, validate} = require('uuid')

// REGISTER NEW USER
// POST: api/users/register
// UNPROTECTED
const registerUser = async (req, res, next) => {
	try {
		const { name, email, password, password2 } = req.body;

		if (!name || !email || !password || !password2) {
			return next(new HttpError("Fill in all fields.", 422));
		}

		if (password !== password2) {
			return next(new HttpError("Passwords do not match.", 422));
		}

		if (password.trim().length < 6) {
			return next(new HttpError("Password should be at least 6 characters.", 422));
		}

		const newEmail = email.toLowerCase();
		const emailExists = await User.findOne({ email: newEmail });

		if (emailExists) {
			return next(new HttpError("Email already exists.", 422));
		}

		const salt = await bcrypt.genSalt(10);
		const hashedPass = await bcrypt.hash(password, salt);
		
		const newUser = new User({
			name,
			email: newEmail,
			password: hashedPass,
		});

		await newUser.save();
		res.status(201).json({ message: `New user ${newUser.email} registered.`, user: newUser });
	} catch (error) {
		console.error('Error registering user:', error);
		return next(new HttpError("User registration failed.", 500));
	}
};

// LOGIN A REGISTERED USER
// POST: api/users/login
// UNPROTECTED
const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return next(new HttpError('Fill in all fields', 422));
        }

        const newEmail = email.toLowerCase();
        const user = await User.findOne({ email: newEmail });

        if (!user) {
            return next(new HttpError('Invalid data', 422));
        }

        const comparePass = await bcrypt.compare(password, user.password);

        if (!comparePass) {
            return next(new HttpError('Invalid password', 422));
        }

        const { _id: id, name } = user;
        const token = jwt.sign({ id, name }, process.env.JWT_SECRET, { expiresIn: '1d' });

        res.status(200).json({ token, id, name });
    } catch (error) {
        console.error('Login error:', error);
        return next(new HttpError('Login failed. Please check your data.', 500));
    }
};

// USER PROFILE
// POST: api/users/id
// PROTECTED
const getUser = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        if (!id) {
            return next(new HttpError("User ID is required", 400));
        }

        const user = await User.findById(id).select('-password');

        if (!user) {
            return next(new HttpError("User not found", 404));
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        return next(new HttpError("Failed to fetch user. Please try again later.", 500));
    }
};

// CHANGE USER AVATAR (profile pic)
// POST: api/users/change-avatar
// PROTECTED
const changeAvatar = async (req, res, next) => {
    try {
        if (!req.files || !req.files.avatar) {
            return next(new HttpError('Choose an image!', 422));
        }
        
        const user = await User.findById(req.user.id);
        if (!user) {
            return next(new HttpError('User not found!', 404));
        }
        
        if (user.avatar) {
            fs.unlink(path.join(__dirname, '..', 'uploads', user.avatar), (err) => {
                if (err) {
                    return next(new HttpError('Could not delete old avatar', 500));
                }
            });
        }

        const { avatar } = req.files;
        if (avatar.size > 2500000) {
            return next(new HttpError('Image too big! Image size should be less than 2.5 MB', 422));
        }

        const fileName = avatar.name;
        const splittedFilesName = fileName.split('.');
        const newFileName = splittedFilesName[0] + uuid() + '.' + splittedFilesName[splittedFilesName.length - 1];

        avatar.mv(path.join(__dirname, '..', 'uploads', newFileName), async (err) => {
            if (err) {
                return next(new HttpError('Could not move the file', 500));
            }

            const updatedAvatar = await User.findByIdAndUpdate(req.user.id, { avatar: newFileName }, { new: true });
            if (!updatedAvatar) {
                return next(new HttpError('Avatar could not be changed', 422));
            }
            res.status(200).json(updatedAvatar);
        });
    } catch (error) {
        return next(new HttpError('Something went wrong', 500));
    }
};


// ADIT USER DETAILS (from profile)
// POST: api/users/edit-user
// PROTECTED

const editUser = async (req, res, next) => {
    try {
        const { name, email, currentPassword, newPassword, confirmNewPassword } = req.body;
        if (!name || !email || !currentPassword || !newPassword || !confirmNewPassword) {
            return next(new HttpError('Fill all fields', 422));
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return next(new HttpError('User not found', 403));
        }

        const emailExist = await User.findOne({ email });
        if (emailExist && (emailExist._id.toString() !== req.user.id)) {
            return next(new HttpError('Email already exists', 422));
        }

        const validateUserPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validateUserPassword) {
            return next(new HttpError('Invalid current password', 422));
        }

        if (newPassword !== confirmNewPassword) {
            return next(new HttpError('New passwords do not match', 422));
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);
        const newInfo = await User.findByIdAndUpdate(req.user.id, { name, email, password: hash }, { new: true });

        res.status(200).json(newInfo);
    } catch (error) {
        return next(new HttpError(error));
    }
};

// GET AUTHORS
// POST: api/users/authors
// UNPROTECTED
const getAuthors = async (req, res, next) => {
    try {
        const authors = await User.find().select('-password');
        res.status(200).json(authors);
    } catch (error) {
        return next(new HttpError("Failed to fetch authors. Please try again later.", 500));
    }
};

module.exports = {
	registerUser,
	loginUser,
	getUser,
	changeAvatar,
	editUser,
	getAuthors,
};