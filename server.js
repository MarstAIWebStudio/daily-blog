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

// ============ 사용자 인증 API ============

// 회원가입/로그인
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: '이메일을 입력해주세요' });
    }

    // 사용자 조회 또는 생성
    let { data: user, error: selectError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      throw selectError;
    }

    if (!user) {
      // 새 사용자 생성
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([{ email, created_at: new Date().toISOString() }])
        .select()
        .single();

      if (insertError) throw insertError;
      user = newUser;
    }

    res.json({ user, message: '로그인 성공' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 현재 사용자 정보
app.get('/api/auth/me/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) throw error;
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ 방(Room) API ============

// 방 목록 조회
app.get('/api/rooms', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('*, room_members(count), posts(count)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 방 생성
app.post('/api/rooms', async (req, res) => {
  try {
    const { name, description, creator_email } = req.body;

    if (!name || !creator_email) {
      return res.status(400).json({ error: '방 이름과 생성자 이메일은 필수입니다' });
    }

    // 방 생성
    const { data: room, error: roomError } = await supabase
      .from('rooms')
      .insert([{
        name,
        description: description || '',
        creator_email,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (roomError) throw roomError;

    // 생성자를 방 멤버로 추가
    const { error: memberError } = await supabase
      .from('room_members')
      .insert([{
        room_id: room.id,
        user_email: creator_email,
        joined_at: new Date().toISOString()
      }]);

    if (memberError) throw memberError;

    res.json(room);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 방 상세 조회
app.get('/api/rooms/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('rooms')
      .select('*, room_members(*), posts(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 방 가입
app.post('/api/rooms/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_email } = req.body;

    if (!user_email) {
      return res.status(400).json({ error: '이메일이 필요합니다' });
    }

    // 이미 가입했는지 확인
    const { data: existing } = await supabase
      .from('room_members')
      .select('*')
      .eq('room_id', id)
      .eq('user_email', user_email)
      .single();

    if (existing) {
      return res.status(400).json({ error: '이미 가입한 방입니다' });
    }

    // 방 멤버 추가
    const { data, error } = await supabase
      .from('room_members')
      .insert([{
        room_id: parseInt(id),
        user_email,
        joined_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;
    res.json({ message: '방에 가입했습니다' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 방에서 나가기
app.post('/api/rooms/:id/leave', async (req, res) => {
  try {
    const { id } = req.params;
    const { user_email } = req.body;

    const { error } = await supabase
      .from('room_members')
      .delete()
      .eq('room_id', id)
      .eq('user_email', user_email);

    if (error) throw error;
    res.json({ message: '방을 나갔습니다' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ 게시글 API ============

// 방의 게시글 목록
app.get('/api/rooms/:roomId/posts', async (req, res) => {
  try {
    const { roomId } = req.params;

    const { data, error } = await supabase
      .from('posts')
      .select('*, comments(*)')
      .eq('room_id', roomId)
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
    const { room_id, title, content, image, author_email } = req.body;

    if (!room_id || !title || !content || !author_email) {
      return res.status(400).json({ error: '필수 정보가 부족합니다' });
    }

    const { data, error } = await supabase
      .from('posts')
      .insert([
        {
          room_id,
          title,
          content,
          image: image || null,
          author_email,
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

    // 댓글 삭제
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
    const { author_email, text } = req.body;

    if (!author_email || !text) {
      return res.status(400).json({ error: '이메일과 댓글은 필수입니다' });
    }

    const { data, error } = await supabase
      .from('comments')
      .insert([
        {
          post_id: parseInt(id),
          author_email,
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
app.delete('/api/comments/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id);

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
