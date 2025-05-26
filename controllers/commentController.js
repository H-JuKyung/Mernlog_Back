import { Comment } from "../models/Comment.js";

export const createComment = async (req, res) => {
  const { content, postId } = req.body;
  const author = req.user.userId;

  try {
    const newComment = await Comment.create({
      content,
      author,
      postId,
    });

    res.status(201).json(newComment);
  } catch (err) {
    console.error("댓글 작성 오류:", err);
    res.status(500).json({ error: "댓글 작성에 실패했습니다." });
  }
};

export const getCommentsByPostId = async (req, res) => {
  try {
    const { postId } = req.params;
    const comments = await Comment.find({ postId }).sort({ createdAt: -1 });

    res.json(comments);
  } catch (err) {
    console.error("Error fetching comments:", err);
    res.status(500).json({ message: "서버 에러" });
  }
};

export const deleteComment = async (req, res) => {
  const { commentId } = req.params;

  try {
    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
    }

    // 댓글 작성자만 삭제할 수 있게 권한 체크 추가
    if (comment.author !== req.user.userId) {
      return res
        .status(403)
        .json({ error: "자신의 댓글만 삭제할 수 있습니다." });
    }

    await Comment.findByIdAndDelete(commentId);
    res.json({ message: "댓글이 삭제되었습니다." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "서버 에러" });
  }
};

export const updateComment = async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  try {
    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
    }

    // 댓글 작성자만 수정할 수 있게 권한 체크 추가
    if (comment.author !== req.user.userId) {
      return res
        .status(403)
        .json({ error: "자신의 댓글만 수정할 수 있습니다." });
    }

    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { content },
      { new: true }
    );

    res.json(updatedComment);
  } catch (err) {
    console.error("Error updating comment:", err);
    res.status(500).json({ message: "서버 에러" });
  }
};
