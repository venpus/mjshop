import express from 'express';
import { postChat, getConversation, saveConversation } from '../controllers/qwenController.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { authenticateUser } from '../middleware/auth.js';

const router = express.Router();
router.post('/chat', asyncHandler(postChat));
router.get('/conversation', authenticateUser, asyncHandler(getConversation));
router.post('/conversation', authenticateUser, asyncHandler(saveConversation));
export default router;
