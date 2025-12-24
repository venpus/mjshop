import { Router } from 'express';
import { AdminAccountController } from '../controllers/adminAccountController.js';

const router = Router();
const controller = new AdminAccountController();

// 관리자 계정 라우트
router.get('/', controller.getAllAccounts);
router.get('/:id', controller.getAccountById);
router.post('/', controller.createAccount);
router.put('/:id', controller.updateAccount);
router.delete('/:id', controller.deleteAccount);

export default router;

