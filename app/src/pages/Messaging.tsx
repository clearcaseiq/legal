import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  getChatRooms, 
  getOrCreateChatRoom, 
  sendMessage, 
  getChatRoomMessages, 
  markMessagesAsRead,
  askChatBot 
} from '../lib/api'
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Clock, 
  Phone, 
  Video, 
  MapPin,
  Plus,
  Search,
  Filter
} from 'lucide-react'
import Tooltip from '../components/Tooltip'

interface ChatRoom {
  id: string
  attorney: {
    id: string
    name: string
    email: string
    profile?: any
  }
  assessment?: {
    id: string
    claimType: string
    venueState: string
  }
  messages: any[]
  status: string
  lastMessageAt?: string
  createdAt: string
}

interface Message {
  id: string
  content: string
  senderType: 'user' | 'attorney'
  messageType: string
  createdAt: string
  isRead: boolean
}

export default function Messaging() {
  const { state } = useLocation() as { state?: { attorneyId?: string; assessmentId?: string } }
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([])
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showChatBot, setShowChatBot] = useState(false)
  const [chatBotMessages, setChatBotMessages] = useState<any[]>([])
  const [chatBotInput, setChatBotInput] = useState('')

  useEffect(() => {
    loadChatRooms()
  }, [])

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom.id)
    }
  }, [selectedRoom])

  const loadChatRooms = async () => {
    try {
      setIsLoading(true)
      const data = await getChatRooms()
      setChatRooms(data)
      if (state?.attorneyId && state?.assessmentId) {
        const room = data.find((r: ChatRoom) => r.attorney?.id === state.attorneyId && r.assessment?.id === state.assessmentId)
        if (room) {
          setSelectedRoom(room)
        } else {
          const newRoom = await getOrCreateChatRoom(state.attorneyId, state.assessmentId)
          const roomData: ChatRoom = {
            id: newRoom.chatRoomId,
            attorney: newRoom.attorney,
            assessment: newRoom.assessment,
            messages: newRoom.messages || [],
            status: newRoom.status || 'ACTIVE',
            lastMessageAt: newRoom.lastMessageAt,
            createdAt: newRoom.createdAt
          }
          setChatRooms((prev) => [...prev.filter((r: ChatRoom) => r.id !== roomData.id), roomData])
          setSelectedRoom(roomData)
        }
      } else if (data.length > 0 && !selectedRoom) {
        setSelectedRoom(data[0])
      }
    } catch (error) {
      console.error('Failed to load chat rooms:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMessages = async (chatRoomId: string) => {
    try {
      const data = await getChatRoomMessages(chatRoomId)
      setMessages(data)
      
      // Mark messages as read
      await markMessagesAsRead(chatRoomId)
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedRoom || isSending) return

    setIsSending(true)
    try {
      await sendMessage({
        chatRoomId: selectedRoom.id,
        content: newMessage,
        messageType: 'text'
      })
      
      setNewMessage('')
      // Reload messages
      await loadMessages(selectedRoom.id)
    } catch (error) {
      console.error('Failed to send message:', error)
    } finally {
      setIsSending(false)
    }
  }

  const handleChatBotMessage = async () => {
    if (!chatBotInput.trim()) return

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: chatBotInput,
      timestamp: new Date().toISOString()
    }

    setChatBotMessages(prev => [...prev, userMessage])
    const input = chatBotInput
    setChatBotInput('')

    try {
      const response = await askChatBot(input)
      
      const botMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.response,
        timestamp: response.timestamp
      }

      setChatBotMessages(prev => [...prev, botMessage])
    } catch (error) {
      console.error('Failed to get chatbot response:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const filteredChatRooms = chatRooms.filter(room =>
    room.attorney.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.assessment?.claimType.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading messages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex h-screen bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Sidebar */}
        <div className="w-1/3 border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold text-gray-900">Messages</h1>
              <Tooltip content="AI Assistant">
                <button
                  onClick={() => setShowChatBot(!showChatBot)}
                  className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                  aria-label="AI Assistant"
                >
                  <Bot className="h-5 w-5" />
                </button>
              </Tooltip>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Chat Rooms List */}
          <div className="flex-1 overflow-y-auto">
            {filteredChatRooms.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No conversations yet</p>
                <Link to="/attorneys-enhanced" state={{ from: '/messaging' }} className="text-primary-600 hover:text-primary-700">
                  Find attorneys to start chatting
                </Link>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {filteredChatRooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedRoom?.id === room.id 
                        ? 'bg-primary-50 border border-primary-200' 
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-600 font-medium text-sm">
                          {room.attorney.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {room.attorney.name}
                          </h3>
                          {room.lastMessageAt && (
                            <span className="text-xs text-gray-500">
                              {formatTime(room.lastMessageAt)}
                            </span>
                          )}
                        </div>
                        
                        {room.assessment && (
                          <p className="text-xs text-gray-500 truncate">
                            {room.assessment.claimType} • {room.assessment.venueState}
                          </p>
                        )}
                        
                        {room.messages.length > 0 && (
                          <p className="text-xs text-gray-600 truncate mt-1">
                            {room.messages[0].content}
                          </p>
                        )}
                      </div>
                      
                      {room.messages.some(m => !m.isRead && m.senderType === 'attorney') && (
                        <div className="w-2 h-2 bg-primary-600 rounded-full flex-shrink-0"></div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="p-4 border-t border-gray-200">
            <Link to="/attorneys-enhanced" state={{ from: '/messaging' }} className="btn-primary w-full">
              <Plus className="h-4 w-4 mr-2" />
              Find Attorneys
            </Link>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedRoom ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-600 font-medium">
                        {selectedRoom.attorney.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {selectedRoom.attorney.name}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {selectedRoom.assessment?.claimType} • {selectedRoom.assessment?.venueState}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                      <Phone className="h-5 w-5" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                      <Video className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="font-medium text-gray-700">
                      {selectedRoom?.attorney?.name || 'Your attorney'} is reviewing your case.
                    </p>
                    <p className="mt-2 text-sm">
                      You will receive a message when an attorney responds.
                    </p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderType === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex max-w-xs lg:max-w-md ${
                        message.senderType === 'user' ? 'flex-row-reverse' : 'flex-row'
                      }`}>
                        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                          message.senderType === 'user' 
                            ? 'bg-primary-600 text-white ml-2' 
                            : 'bg-gray-200 text-gray-600 mr-2'
                        }`}>
                          {message.senderType === 'user' ? <User className="h-4 w-4" /> : <User className="h-4 w-4" />}
                        </div>
                        <div className={`px-4 py-2 rounded-lg ${
                          message.senderType === 'user'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                          <p className={`text-xs mt-1 ${
                            message.senderType === 'user' ? 'text-primary-100' : 'text-gray-500'
                          }`}>
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={isSending}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isSending || !newMessage.trim()}
                    className="btn-primary"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                <p>Choose a conversation from the sidebar to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Bot Modal */}
      {showChatBot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[600px] flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Bot className="h-6 w-6 text-primary-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">AI Assistant</h3>
                </div>
                <button
                  onClick={() => setShowChatBot(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatBotMessages.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <Bot className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Ask me anything about your legal case!</p>
                </div>
              )}
              {chatBotMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-xs ${
                    message.type === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}>
                    <div className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${
                      message.type === 'user' 
                        ? 'bg-primary-600 text-white ml-2' 
                        : 'bg-gray-200 text-gray-600 mr-2'
                    }`}>
                      {message.type === 'user' ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                    </div>
                    <div className={`px-3 py-2 rounded-lg text-sm ${
                      message.type === 'user'
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {message.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={chatBotInput}
                  onChange={(e) => setChatBotInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleChatBotMessage()}
                  placeholder="Ask a question..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
                <button
                  onClick={handleChatBotMessage}
                  disabled={!chatBotInput.trim()}
                  className="btn-primary text-sm"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
