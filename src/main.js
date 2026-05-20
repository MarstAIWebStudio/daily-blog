// IndexedDB 설정
const DB_NAME = 'DailyBlogDB'
const DB_VERSION = 1
let db = null

// IndexedDB 초기화
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)
        
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
            db = request.result
            resolve(db)
        }
        
        request.onupgradeneeded = (event) => {
            const database = event.target.result
            
            // Users 테이블
            if (!database.objectStoreNames.contains('users')) {
                database.createObjectStore('users', { keyPath: 'email' })
            }
            
            // Rooms 테이블
            if (!database.objectStoreNames.contains('rooms')) {
                const roomStore = database.createObjectStore('rooms', { keyPath: 'id' })
                roomStore.createIndex('createdAt', 'createdAt', { unique: false })
            }
            
            // Posts 테이블
            if (!database.objectStoreNames.contains('posts')) {
                const postStore = database.createObjectStore('posts', { keyPath: 'id' })
                postStore.createIndex('roomId', 'roomId', { unique: false })
                postStore.createIndex('createdAt', 'createdAt', { unique: false })
            }
            
            // Comments 테이블
            if (!database.objectStoreNames.contains('comments')) {
                const commentStore = database.createObjectStore('comments', { keyPath: 'id' })
                commentStore.createIndex('postId', 'postId', { unique: false })
                commentStore.createIndex('createdAt', 'createdAt', { unique: false })
            }
            
            // RoomMembers 테이블
            if (!database.objectStoreNames.contains('roomMembers')) {
                const memberStore = database.createObjectStore('roomMembers', { keyPath: 'id' })
                memberStore.createIndex('roomId', 'roomId', { unique: false })
                memberStore.createIndex('email', 'email', { unique: false })
            }
        }
    })
}

// 전역 변수
let currentUser = null
let currentRoom = null

// 로그인
async function login() {
    const email = document.getElementById('loginEmail').value.trim()
    if (!email) {
        showMessage('이메일을 입력하세요', 'error')
        return
    }
    
    try {
        const transaction = db.transaction(['users'], 'readwrite')
        const store = transaction.objectStore('users')
        
        // 사용자 조회 또는 생성
        const getRequest = store.get(email)
        
        getRequest.onsuccess = () => {
            let user = getRequest.result
            if (!user) {
                user = {
                    email,
                    createdAt: new Date().toISOString()
                }
                store.add(user)
            }
            
            currentUser = user
            showMainScreen()
            loadRooms()
        }
    } catch (error) {
        showMessage('로그인 실패: ' + error.message, 'error')
    }
}

// 로그아웃
function logout() {
    currentUser = null
    currentRoom = null
    document.getElementById('loginScreen').style.display = 'block'
    document.getElementById('mainScreen').style.display = 'none'
    document.getElementById('loginEmail').value = ''
}

// 메인 화면 표시
function showMainScreen() {
    document.getElementById('loginScreen').style.display = 'none'
    document.getElementById('mainScreen').style.display = 'block'
    document.getElementById('userEmail').textContent = currentUser.email
}

// 메시지 표시
function showMessage(text, type = 'info') {
    const messageDiv = document.getElementById('message')
    messageDiv.textContent = text
    messageDiv.className = 'message ' + type
    setTimeout(() => {
        messageDiv.textContent = ''
        messageDiv.className = 'message'
    }, 3000)
}

// 탭 전환
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'))
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'))
    
    document.getElementById(tabName).classList.add('active')
    event.target.classList.add('active')
    
    if (tabName === 'current-room' && currentRoom) {
        loadRoomDetail()
    }
}

// 방 목록 로드
async function loadRooms() {
    try {
        const transaction = db.transaction(['rooms'], 'readonly')
        const store = transaction.objectStore('rooms')
        const request = store.getAll()
        
        request.onsuccess = () => {
            const rooms = request.result
            const grid = document.getElementById('roomsGrid')
            
            if (rooms.length === 0) {
                grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">만들어진 방이 없습니다</p>'
                return
            }
            
            grid.innerHTML = rooms.map(room => `
                <div class="room-card">
                    <h3>${room.name}</h3>
                    <p>${room.description || '설명 없음'}</p>
                    <small>생성: ${new Date(room.createdAt).toLocaleDateString('ko-KR')}</small>
                    <button class="btn-primary" onclick="joinRoom('${room.id}')" style="width: 100%; margin-top: 10px;">입장</button>
                </div>
            `).join('')
        }
    } catch (error) {
        showMessage('방 목록 로드 실패: ' + error.message, 'error')
    }
}

// 방 만들기
async function createRoom() {
    const name = document.getElementById('roomName').value.trim()
    const description = document.getElementById('roomDescription').value.trim()
    
    if (!name) {
        showMessage('방 이름을 입력하세요', 'error')
        return
    }
    
    try {
        const room = {
            id: 'room_' + Date.now(),
            name,
            description,
            createdBy: currentUser.email,
            createdAt: new Date().toISOString()
        }
        
        const transaction = db.transaction(['rooms', 'roomMembers'], 'readwrite')
        const roomStore = transaction.objectStore('rooms')
        const memberStore = transaction.objectStore('roomMembers')
        
        roomStore.add(room)
        
        // 방 생성자를 멤버로 추가
        memberStore.add({
            id: 'member_' + Date.now(),
            roomId: room.id,
            email: currentUser.email,
            joinedAt: new Date().toISOString()
        })
        
        document.getElementById('roomName').value = ''
        document.getElementById('roomDescription').value = ''
        showMessage('방이 생성되었습니다!', 'success')
        
        await loadRooms()
    } catch (error) {
        showMessage('방 생성 실패: ' + error.message, 'error')
    }
}

// 방 입장
async function joinRoom(roomId) {
    try {
        const transaction = db.transaction(['rooms', 'roomMembers'], 'readwrite')
        const roomStore = transaction.objectStore('rooms')
        const memberStore = transaction.objectStore('roomMembers')
        
        // 방 정보 조회
        const roomRequest = roomStore.get(roomId)
        roomRequest.onsuccess = () => {
            currentRoom = roomRequest.result
            
            // 멤버 추가
            const memberIndex = memberStore.index('email')
            const memberQuery = memberIndex.getAll(currentUser.email)
            
            memberQuery.onsuccess = () => {
                const existingMembers = memberQuery.result.filter(m => m.roomId === roomId)
                if (existingMembers.length === 0) {
                    memberStore.add({
                        id: 'member_' + Date.now(),
                        roomId,
                        email: currentUser.email,
                        joinedAt: new Date().toISOString()
                    })
                }
                
                switchTab('current-room')
                loadRoomDetail()
            }
        }
    } catch (error) {
        showMessage('방 입장 실패: ' + error.message, 'error')
    }
}

// 방 상세 정보 로드
async function loadRoomDetail() {
    if (!currentRoom) return
    
    try {
        const transaction = db.transaction(['posts', 'comments'], 'readonly')
        const postStore = transaction.objectStore('posts')
        const postIndex = postStore.index('roomId')
        const postsRequest = postIndex.getAll(currentRoom.id)
        
        postsRequest.onsuccess = () => {
            const posts = postsRequest.result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            
            const detail = document.getElementById('roomDetail')
            detail.innerHTML = `
                <div style="background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                    <h2>${currentRoom.name}</h2>
                    <p>${currentRoom.description || '설명 없음'}</p>
                    
                    <div style="margin-top: 30px; margin-bottom: 30px;">
                        <h3>새 게시글 작성</h3>
                        <div class="form-group">
                            <input type="text" id="postTitle" placeholder="제목">
                        </div>
                        <div class="form-group">
                            <textarea id="postContent" placeholder="내용을 작성하세요"></textarea>
                        </div>
                        <button class="btn-primary" onclick="createPost()" style="width: 100%;">게시글 작성</button>
                    </div>
                    
                    <h3>게시글 (${posts.length})</h3>
                    <div id="postsList">
                        ${posts.length === 0 ? '<p style="color: #999;">게시글이 없습니다</p>' : posts.map(post => `
                            <div style="background: #f9f9f9; padding: 20px; margin-bottom: 15px; border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: start;">
                                    <div>
                                        <h4 style="margin: 0 0 5px 0;">${post.title}</h4>
                                        <small style="color: #999;">${post.author} • ${new Date(post.createdAt).toLocaleDateString('ko-KR')}</small>
                                    </div>
                                    ${post.author === currentUser.email ? `<button class="btn-secondary" onclick="deletePost('${post.id}')" style="padding: 5px 10px;">삭제</button>` : ''}
                                </div>
                                <p style="margin: 10px 0; white-space: pre-wrap;">${post.content}</p>
                                
                                <div style="background: white; padding: 15px; border-radius: 6px; margin-top: 10px;">
                                    <h5 style="margin-top: 0;">댓글</h5>
                                    <div id="comments-${post.id}"></div>
                                    
                                    <div style="margin-top: 10px;">
                                        <input type="text" id="comment-input-${post.id}" placeholder="댓글을 입력하세요" style="width: calc(100% - 60px); padding: 8px;">
                                        <button class="btn-primary" onclick="addComment('${post.id}')" style="width: 50px; margin-left: 5px;">등록</button>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `
            
            // 댓글 로드
            posts.forEach(post => loadComments(post.id))
        }
    } catch (error) {
        showMessage('방 정보 로드 실패: ' + error.message, 'error')
    }
}

// 게시글 작성
async function createPost() {
    const title = document.getElementById('postTitle').value.trim()
    const content = document.getElementById('postContent').value.trim()
    
    if (!title || !content) {
        showMessage('제목과 내용을 입력하세요', 'error')
        return
    }
    
    try {
        const post = {
            id: 'post_' + Date.now(),
            roomId: currentRoom.id,
            title,
            content,
            author: currentUser.email,
            createdAt: new Date().toISOString()
        }
        
        const transaction = db.transaction(['posts'], 'readwrite')
        const store = transaction.objectStore('posts')
        store.add(post)
        
        document.getElementById('postTitle').value = ''
        document.getElementById('postContent').value = ''
        showMessage('게시글이 작성되었습니다!', 'success')
        
        loadRoomDetail()
    } catch (error) {
        showMessage('게시글 작성 실패: ' + error.message, 'error')
    }
}

// 게시글 삭제
async function deletePost(postId) {
    if (!confirm('정말 삭제하시겠습니까?')) return
    
    try {
        const transaction = db.transaction(['posts', 'comments'], 'readwrite')
        const postStore = transaction.objectStore('posts')
        const commentStore = transaction.objectStore('comments')
        
        postStore.delete(postId)
        
        // 해당 게시글의 댓글도 삭제
        const commentIndex = commentStore.index('postId')
        const commentsRequest = commentIndex.getAll(postId)
        
        commentsRequest.onsuccess = () => {
            commentsRequest.result.forEach(comment => {
                commentStore.delete(comment.id)
            })
        }
        
        showMessage('게시글이 삭제되었습니다', 'success')
        loadRoomDetail()
    } catch (error) {
        showMessage('게시글 삭제 실패: ' + error.message, 'error')
    }
}

// 댓글 로드
async function loadComments(postId) {
    try {
        const transaction = db.transaction(['comments'], 'readonly')
        const store = transaction.objectStore('comments')
        const index = store.index('postId')
        const request = index.getAll(postId)
        
        request.onsuccess = () => {
            const comments = request.result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
            const container = document.getElementById('comments-' + postId)
            
            if (container) {
                container.innerHTML = comments.map(comment => `
                    <div style="background: #f0f0f0; padding: 10px; border-radius: 4px; margin-bottom: 8px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <small style="color: #666;"><strong>${comment.author}</strong> • ${new Date(comment.createdAt).toLocaleString('ko-KR')}</small>
                            ${comment.author === currentUser.email ? `<button class="btn-secondary" onclick="deleteComment('${comment.id}')" style="padding: 2px 8px; font-size: 12px;">삭제</button>` : ''}
                        </div>
                        <p style="margin: 5px 0 0 0;">${comment.content}</p>
                    </div>
                `).join('')
            }
        }
    } catch (error) {
        console.error('댓글 로드 실패:', error)
    }
}

// 댓글 추가
async function addComment(postId) {
    const input = document.getElementById('comment-input-' + postId)
    const content = input.value.trim()
    
    if (!content) {
        showMessage('댓글을 입력하세요', 'error')
        return
    }
    
    try {
        const comment = {
            id: 'comment_' + Date.now(),
            postId,
            content,
            author: currentUser.email,
            createdAt: new Date().toISOString()
        }
        
        const transaction = db.transaction(['comments'], 'readwrite')
        const store = transaction.objectStore('comments')
        store.add(comment)
        
        input.value = ''
        loadComments(postId)
    } catch (error) {
        showMessage('댓글 추가 실패: ' + error.message, 'error')
    }
}

// 댓글 삭제
async function deleteComment(commentId) {
    if (!confirm('댓글을 삭제하시겠습니까?')) return
    
    try {
        const transaction = db.transaction(['comments'], 'readwrite')
        const store = transaction.objectStore('comments')
        store.delete(commentId)
        
        // 모든 댓글 다시 로드
        const postsList = document.getElementById('postsList')
        if (postsList) {
            loadRoomDetail()
        }
    } catch (error) {
        showMessage('댓글 삭제 실패: ' + error.message, 'error')
    }
}

// 초기화
window.addEventListener('DOMContentLoaded', async () => {
    try {
        await initDB()
    } catch (error) {
        showMessage('데이터베이스 초기화 실패: ' + error.message, 'error')
    }
})
