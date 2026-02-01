import express from 'express';
import OrderController from '../controllers/OrderController';
const router = express.Router();

router.get('/test', (req, res) => {
    return res.status(200).json({ message: 'Testing route '});
})

router.post('/orders/create', OrderController.create);
router.get('/orders', OrderController.findAll);
router.get('/orders/:id', OrderController.findOne);
router.patch('/orders/:id', OrderController.update);
router.delete('/orders/:id', OrderController.delete);

export default router;
