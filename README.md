Routes

CHAT
GET /chat/all {top_level_chats}
GET /chat/videoRequest?chatId&videoRequestId
GET /chat {chatId, last_100_messages_top_level}
POST /chat {editorId}
POST /chat/message {chatId, type: image/video/audio, from, data}
  data can be: 
    text
    image
    audio
    combination of above
POST /chat/videoRequest {chatId, data} // data is video request data.
DELETE /chat

Feedback

POST /feature
POST /feedback

POST /connectYoutube