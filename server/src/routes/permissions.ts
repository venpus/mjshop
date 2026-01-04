import { Router } from 'express';
import { PermissionController } from '../controllers/permissionController.js';

const router = Router();
const controller = new PermissionController();

// 권한 설정 라우트
router.get('/', controller.getAllPermissions);
router.put('/', controller.savePermissions);

export default router;

