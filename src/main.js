import { createClient } from '@supabase/supabase-js'

// Supabase 설정
const SUPABASE_URL = 'https://mzlhzvalhzrztnmvywuj.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16bGh6dmFsaHpyenRubXZ5d3VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxNzcwNTgsImV4cCI6MjA5NDc1MzA1OH0.dFydAdJ5eBmXpvCRaDpy44-iO2_YWBCq2d1wwv0cSik'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

let currentUser = null
let currentRoom = null

// 로그인
async function login() {
    const email = document.getElementById('loginEmail').value.trim()

    if (!email) {
        showMessage('이메일을 입력해주세요', 'error')
        return
    }

    try {
        // 사용자 조회 또는 생성
        let { data: user, error: selectError } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single()

        if (selectError && selectError.code !== 'PGRST116') {
            throw selectError
        }

        if (!user) {
            const { data: newUser, error: insertError } = await supabase
                .from('users')
                .insert([{ email }])
                .select()
                .single()

            if (insertError) throw insertError
            user = newUser
        }

        currentUser = user
        localStorage.setItem('userEmail', email)

        document.getElementById('loginScreen').style.display = 'none'
        document.getElementById('mainScreen').classList.add('active')
        document.getElementById('userEmail').textContent = email

        loadRooms()
    } catch (error) {
        console.error('Error:', error)
        showMessage('오류: ' + error.message, 'error')
    }
}

// 로그아웃
function logout() {
    if (confirm('로그아웃하시겠습니까?')) {
        currentUser = null
        currentRoom = null
        localStorage.removeItem('userEmail')
        
        document.getElementById('mainScreen').classList.remove('active')
        document.getElementById('loginScreen').style.display = 'block'
        document.getElementById('loginEmail').value = ''
        document.getElementById('loginEmail').focus()
    }
}

// 탭 전환
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'))
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'))
    
    document.getElementById(tabName).classList.add('active')
    event.target.classList.add('active')
}

// 메시지 표시
function showMessage(text, type = 'success') {
    const messageEl = document.getElementById('message')
    messageEl.innerHTML = `<div class="${type}">${text}</div>`
    setTimeout(() => {
        messageEl.innerHTML = ''
    }, 3000)
}

// 방 목록 로드
async function loadRooms() {
    try {
        const { data: rooms, error } = await supabase
            .from('rooms')
            .select('*, posts(count)')
            .order('created_at', { ascending: false })

        if (error) throw error
        renderRooms(rooms || [])
    } catch (error) {
        console.error('Error:', error)
        document.getElementById('roomsGrid').innerHTML = 
            `<div class="error">${error.message}</div>`
    }
}

// 방 목록 렌더링
function renderRooms(rooms) {
    const grid = document.getElementById('roomsGrid')

    if (rooms.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>아직 방이 없습니다. 첫 번째 방을 만들어보세요!</p></div>'
        return
    }

    grid.innerHTML = rooms.map(room => `
        <div class="room-card">
            <div class="room-name">${escapeHtml(room.name)}</div>
            <div class="room-description">${escapeHtml(room.description || '설명 없음')}</div>
            <div class="room-meta">
                <span>생성자: ${room.creator_email}</span>
                <span>${room.posts ? room.posts[0].count : 0}개 게시글</span>
            </div>
            <div class="room-actions">
                <button class="btn-secondary" onclick="enterRoom(${room.id})">입장</button>
            </div>
        </div>
    `).join('')
}

// 방 만들기
async function createRoom() {
    const name = document.getElementById('roomName').value.trim()
    const description = document.getElementById('roomDescription').value.trim()

    if (!name) {
        showMessage('방 이름을 입력해주세요', 'error')
        return
    }

    try {
        const { error } = await supabase
            .from('rooms')
            .insert([{
                name,
                description: description || '',
                creator_email: currentUser.email
            }])

        if (error) throw error

        showMessage('방이 생성되었습니다!', 'success')
        document.getElementById('roomName').value = ''
        document.getElementById('roomDescription').value = ''
        
        switchTab('rooms')
        loadRooms()
    } catch (error) {
        console.error('Error:', error)
        showMessage('오류: ' + error.message, 'error')
    }
}

// 방 입장
async function enterRoom(roomId) {
    try {
        const { data: room, error } = await supabase
            .from('rooms')
            .select('*, posts(*, comments(*))')
            .eq('id', roomId)
            .single()

        if (error) throw error

        currentRoom = room
        renderRoomDetail()
        switchTab('current-room')
    } catch (error) {
        console.error('Error:', error)
        showMessage('오류: ' + error.message, 'error')
    }
}

// 방 상세 렌더링
function renderRoomDetail() {
    const detail = document.getElementById('roomDetail')
    
    detail.innerHTML = `
        <div class="room-detail">
            <div class="room-header">
                <div>
                    <h2>${escapeHtml(currentRoom.name)}</h2>
                    <p style="color: #666; margin-top: 5px;">${escapeHtml(currentRoom.description || '')}</p>
                </div>
                <button class="btn-danger" onclick="exitRoom()">방 나가기</button>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="color: #333; margin-bottom: 10px;">새 게시글 작성</h3>
                <div class="form-group">
                    <input type="text" id="postTitle" placeholder="제목">
                </div>
                <div class="form-group">
                    <textarea id="postContent" placeholder="내용"></textarea>
                </div>
                <div class="form-group">
                    <input type="file" id="postImage" accept="image/*">
                </div>
                <button class="btn-primary" onclick="createPost()" style="width: 100%;">게시글 작성</button>
            </div>

            <h3 style="color: #333; margin-bottom: 20px;">게시글</h3>
            <div class="posts-section" id="postsContainer">
                <div class="empty-state"><p>아직 게시글이 없습니다</p></div>
            </div>
        </div>
    `

    renderRoomPosts()
}

// 게시글 렌더링
function renderRoomPosts() {
    const posts = currentRoom.posts || []
    const container = document.getElementById('postsContainer')

    if (posts.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>아직 게시글이 없습니다</p></div>'
        return
    }

    container.innerHTML = posts.map(post => `
        <div class="post">
            <div class="post-header">
                <div>
                    <div class="post-title">${escapeHtml(post.title)}</div>
                    <div class="post-meta">${post.author_email} • ${formatDate(post.created_at)}</div>
                </div>
                ${post.author_email === currentUser.email ? 
                    `<button class="btn-danger" onclick="deletePost(${post.id})">삭제</button>` : ''}
            </div>

            ${post.image ? `<img src="${post.image}" alt="게시글 이미지" class="post-image">` : ''}

            <div class="post-content">${escapeHtml(post.content)}</div>

            <div class="comments-section">
                <div class="comments-title">댓글 (${post.comments ? post.comments.length : 0})</div>

                ${post.comments && post.comments.length > 0 ? 
                    post.comments.map(comment => `
                        <div class="comment">
                            <div class="comment-content">
                                <div class="comment-author">${escapeHtml(comment.author_email)}</div>
                                <div class="comment-text">${escapeHtml(comment.text)}</div>
                                <div class="comment-date">${formatDate(comment.created_at)}</div>
                            </div>
                            ${comment.author_email === currentUser.email ? 
                                `<button class="btn-danger" onclick="deleteComment(${comment.id})">삭제</button>` : ''}
                        </div>
                    `).join('')
                    : '<p style="color: #999; margin: 10px 0;">댓글이 없습니다</p>'
                }

                <div class="add-comment">
                    <textarea id="comment-text-${post.id}" placeholder="댓글을 입력하세요..."></textarea>
                    <button class="btn-primary" onclick="addComment(${post.id})">댓글 작성</button>
                </div>
            </div>
        </div>
    `).join('')
}

// 게시글 작성
async function createPost() {
    const title = document.getElementById('postTitle').value.trim()
    const content = document.getElementById('postContent').value.trim()
    const imageInput = document.getElementById('postImage')

    if (!title || !content) {
        showMessage('제목과 내용을 입력해주세요', 'error')
        return
    }

    try {
        let imageData = null
        if (imageInput.files.length > 0) {
            imageData = await fileToBase64(imageInput.files[0])
        }

        const { error } = await supabase
            .from('posts')
            .insert([{
                room_id: currentRoom.id,
                title,
                content,
                image: imageData,
                author_email: currentUser.email
            }])

        if (error) throw error

        showMessage('게시글이 작성되었습니다!', 'success')
        document.getElementById('postTitle').value = ''
        document.getElementById('postContent').value = ''
        document.getElementById('postImage').value = ''
        
        await enterRoom(currentRoom.id)
    } catch (error) {
        console.error('Error:', error)
        showMessage('오류: ' + error.message, 'error')
    }
}

// 게시글 삭제
async function deletePost(postId) {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId)

        if (error) throw error

        showMessage('게시글이 삭제되었습니다', 'success')
        await enterRoom(currentRoom.id)
    } catch (error) {
        console.error('Error:', error)
        showMessage('오류: ' + error.message, 'error')
    }
}

// 댓글 추가
async function addComment(postId) {
    const text = document.getElementById(`comment-text-${postId}`).value.trim()

    if (!text) {
        showMessage('댓글을 입력해주세요', 'error')
        return
    }

    try {
        const { error } = await supabase
            .from('comments')
            .insert([{
                post_id: postId,
                author_email: currentUser.email,
                text
            }])

        if (error) throw error

        showMessage('댓글이 작성되었습니다!', 'success')
        document.getElementById(`comment-text-${postId}`).value = ''
        await enterRoom(currentRoom.id)
    } catch (error) {
        console.error('Error:', error)
        showMessage('오류: ' + error.message, 'error')
    }
}

// 댓글 삭제
async function deleteComment(commentId) {
    if (!confirm('댓글을 삭제하시겠습니까?')) return

    try {
        const { error } = await supabase
            .from('comments')
            .delete()
            .eq('id', commentId)

        if (error) throw error

        showMessage('댓글이 삭제되었습니다', 'success')
        await enterRoom(currentRoom.id)
    } catch (error) {
        console.error('Error:', error)
        showMessage('오류: ' + error.message, 'error')
    }
}

// 방 나가기
function exitRoom() {
    currentRoom = null
    switchTab('rooms')
    loadRooms()
}

// 파일을 Base64로 변환
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(file)
    })
}

// 날짜 포맷팅
function formatDate(dateString) {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

// HTML 이스케이프
function escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

// 페이지 로드 시
window.addEventListener('load', () => {
    const savedEmail = localStorage.getItem('userEmail')
    if (savedEmail) {
        document.getElementById('loginEmail').value = savedEmail
        setTimeout(() => login(), 100)
    } else {
        document.getElementById('loginEmail').focus()
    }
})

// 전역 함수로 노출
window.login = login
window.logout = logout
window.switchTab = switchTab
window.createRoom = createRoom
window.enterRoom = enterRoom
window.createPost = createPost
window.deletePost = deletePost
window.addComment = addComment
window.deleteComment = deleteComment
window.exitRoom = exitRoom
