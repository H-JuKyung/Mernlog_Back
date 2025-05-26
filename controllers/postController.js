import { Post } from "../models/Post.js";
import { Comment } from "../models/Comment.js";

export const createPost = async (req, res) => {
  try {
    const { title, summary, content } = req.body;

    const postData = {
      title,
      summary,
      content,
      cover: req.file ? req.file.path : null,
      author: req.user.userId,
    };

    await Post.create(postData);

    res.json({ message: "포스트 글쓰기 성공" });
  } catch (err) {
    console.log("에러", err);
    return res.status(500).json({ error: "서버 에러" });
  }
};

export const getPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 3;
    const skip = page * limit;

    const total = await Post.countDocuments();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const userId = req.user?.id || null; // optionalAuthenticateToken 사용 시

    // 각 포스트의 댓글 수 조회
    const postsWithCommentCounts = await Promise.all(
      posts.map(async (post) => {
        const commentCount = await Comment.countDocuments({
          postId: post._id,
        });
        const postObject = post.toObject();
        postObject.commentCount = commentCount;
        postObject.likesCount = post.likes.length;
        postObject.isLiked = userId
          ? post.likes.some((likeId) => likeId.toString() === userId)
          : false;
        return postObject;
      })
    );

    const hasMore = total > skip + posts.length;

    res.json({
      posts: postsWithCommentCounts,
      hasMore,
      total,
    });
  } catch (err) {
    console.error("게시물 조회 오류:", err);
    res.status(500).json({ error: "게시물 조회에 실패했습니다." });
  }
};

export const getPostById = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ error: "게시물을 찾을 수 없습니다." });
    }

    // 댓글 수 조회
    const commentCount = await Comment.countDocuments({ postId });

    // 로그인한 사용자 ID
    const userId = req.user?.id || null;

    // 현재 사용자가 좋아요를 눌렀는지 판단
    const isLiked = userId
      ? post.likes.some((likeId) => likeId.toString() === userId)
      : false;

    // 응답 객체 생성
    const postWithCommentCount = post.toObject();
    postWithCommentCount.commentCount = commentCount;
    postWithCommentCount.likesCount = post.likes.length;
    postWithCommentCount.isLiked = isLiked;

    res.json(postWithCommentCount);
  } catch (err) {
    console.error("게시물 상세 조회 오류:", err);
    res.status(500).json({ error: "게시물 상세 조회에 실패했습니다." });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findByIdAndDelete(postId);
    if (!post) {
      return res.status(404).json({ error: "게시물을 찾을 수 없습니다." });
    }
    res.json({ message: "게시물이 삭제되었습니다." });
  } catch (err) {
    console.error("게시물 삭제 오류:", err);
    res.status(500).json({ error: "게시물 삭제에 실패했습니다." });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, summary, content } = req.body;
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ error: "게시물을 찾을 수 없습니다." });
    }

    if (post.author !== req.user.userId) {
      return res.status(403).json({ error: "자신의 글만 수정할 수 있습니다." });
    }

    const updateData = {
      title,
      summary,
      content,
    };

    if (req.file) {
      updateData.cover = req.file.path;
    }

    const updatedPost = await Post.findByIdAndUpdate(postId, updateData, {
      new: true,
    });

    res.json({
      message: "게시물이 수정되었습니다.",
      post: updatedPost,
    });
  } catch (err) {
    console.error("게시물 수정 오류:", err);
    res.status(500).json({ error: "게시물 수정에 실패했습니다." });
  }
};

export const toggleLike = async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;

  try {
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({ message: "게시물을 찾을 수 없습니다." });
    }

    const likeIndex = post.likes.findIndex((id) => id.toString() === userId);

    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1);
    } else {
      post.likes.push(userId);
    }

    await post.save();

    // 좋아요 갱신 후 상태 반환
    const isLiked = post.likes.some((id) => id.toString() === userId);
    res.json({ likesCount: post.likes.length, isLiked });
  } catch (error) {
    console.error("좋아요 토글 기능 오류:", error);
    res.status(500).json({ message: "서버 에러" });
  }
};
