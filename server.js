const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ============ 게시글 API ============

// 게시글 목록 조회
app.get('/api/posts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*, comments(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 게시글 작성
app.post('/api/posts', async (req, res) => {
  try {
    const { title, content, image } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: '제목과 내용은 필수입니다' });
    }

    const { data, error } = await supabase
      .from('posts')
      .insert([
        {
          title,
          content,
          image: image || null,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 게시글 삭제
app.delete('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 먼저 해당 게시글의 댓글 삭제
    await supabase
      .from('comments')
      .delete()
      .eq('post_id', id);

    // 게시글 삭제
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: '게시글이 삭제되었습니다' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ 댓글 API ============

// 댓글 추가
app.post('/api/posts/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { author, text } = req.body;

    if (!author || !text) {
      return res.status(400).json({ error: '작성자와 댓글은 필수입니다' });
    }

    const { data, error } = await supabase
      .from('comments')
      .insert([
        {
          post_id: parseInt(id),
          author,
          text,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 댓글 삭제
app.delete('/api/posts/:postId/comments/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
    res.json({ message: '댓글이 삭제되었습니다' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============ 헬스 체크 ============

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK' });
});

// ============ 서버 시작 ============

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 실행 중입니다`);
  console.log(`📝 블로그 API: http://localhost:${PORT}/api`);
});
