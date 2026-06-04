const express = require('express');
const router = express.Router();
const reservationController = require('./reservation.controller');
const { verifyToken } = require('../../middlewares/auth.middleware');

router.post('/', verifyToken, reservationController.createReservation);
router.get('/', verifyToken, reservationController.getWaitlists);
router.get('/book/:book_id', verifyToken, reservationController.getWaitlistForBook);
router.delete('/:id', verifyToken, reservationController.cancelReservation);

module.exports = router;
