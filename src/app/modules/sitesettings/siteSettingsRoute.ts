import { Router } from 'express';
import { siteSettingsControllers } from './siteSetting.controller';

const router = Router();


router.get('/', siteSettingsControllers.getSettings);
router.patch('/', siteSettingsControllers.updateSettings);

export const siteSettingRoutes = router;