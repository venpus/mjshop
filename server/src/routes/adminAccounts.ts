import { Router } from 'express';
import { AdminAccountController } from '../controllers/adminAccountController.js';

const router = Router();
const controller = new AdminAccountController();

// 관리자 계정 라우트
router.post('/signup', controller.signup); // 가입 신청 (다른 라우트보다 먼저 정의)
router.post('/login', controller.login); // 로그인 (다른 라우트보다 먼저 정의)
router.get('/', controller.getAllAccounts);
router.get('/:id', controller.getAccountById);
router.post('/', controller.createAccount);
router.put('/:id', controller.updateAccount);
router.delete('/:id', controller.deleteAccount);

export default router;

