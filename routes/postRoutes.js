const {Router} = require('express')

const {
    getPosts,
    getPost,
    getCatPost,
    getUserPost,
    createPost,
    deletePost,
    editPost
} = require('../controllers/postControllers')
const authMiddleware = require("../middleware//authMiddleware")
const router = Router()

router.post('/',authMiddleware, createPost)
router.get('/', getPosts)
router.get('/:id', getPost)
router.get('/users/:id', getUserPost)
router.get('/categories/:category', getCatPost)
router.patch('/:id', authMiddleware,editPost)
router.delete('/:id', authMiddleware,deletePost)


module.exports = router