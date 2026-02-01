import { Request, Response } from "express";
import prisma from "../config/prisma";

class OrderController {
    static async create(req: Request, res: Response): Promise<any> {
        const { itemName, itemPrice } = req.body;

        if (!itemName) return res.status(400).send('itemName is required');
        if (itemPrice == undefined) return res.status(400).send('itemPrice is required');

        try {
            const order = await prisma.orders.create({
                data: {
                    itemName: itemName,
                    itemPrice: itemPrice
                }
            });

            if (!order) return res.status(500).send('Failed to create order');

            return res.status(201).send(order);
        } catch (error: any) {
            console.error('Error creating order: ', error);
            return res.status(500).json({ message: 'Internal Server Error', error: error instanceof Error ? error.message : String(error) });
        }
    }

    static async findAll(req: Request, res: Response): Promise<any> {
        const minPriceRaw = req.query.minPrice;
        const maxPriceRaw = req.query.maxPrice;

        const minPrice =
            typeof minPriceRaw === "string" && minPriceRaw !== ""
                ? Number(minPriceRaw)
                : undefined;

        const maxPrice =
            typeof maxPriceRaw === "string" && maxPriceRaw !== ""
                ? Number(maxPriceRaw)
                : undefined;

        if (minPrice !== undefined && !Number.isFinite(minPrice)) {
            return res.status(400).send("minPrice must be a number");
        }
        if (maxPrice !== undefined && !Number.isFinite(maxPrice)) {
            return res.status(400).send("maxPrice must be a number");
        }
        if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
            return res.status(400).send("minPrice cannot be greater than maxPrice");
        }

        try {
            const priceFilter: { gte?: number; lte?: number } = {};
            if (minPrice !== undefined) priceFilter.gte = minPrice;
            if (maxPrice !== undefined) priceFilter.lte = maxPrice;

            const where: any = {};
            if (Object.keys(priceFilter).length > 0) {
                where.itemPrice = priceFilter;
            }

            const orders = await prisma.orders.findMany({
                where: Object.keys(where).length ? where : undefined,
                orderBy: { createdAt: "desc" },
            });

            return res.status(200).send(orders);
        } catch (error: any) {
            console.error('Error fetching order: ', error);
            return res.status(500).json({ message: 'Internal Server Error', error: error instanceof Error ? error.message : String(error) });
        }
    }

    static async findOne(req: Request, res: Response): Promise<any> {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).send('id must be an integer');

        try {
            const order = await prisma.orders.findUnique({ where: { id } });
            if (!order) return res.status(404).send('Order not found');

            return res.status(200).send(order);
        } catch (error: any) {
            console.error('Error fetching order: ', error);
            return res.status(500).json({ message: 'Internal Server Error', error: error instanceof Error ? error.message : String(error) });
        }
    }

    static async update(req: Request, res: Response): Promise<any> {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).send('id must be an integer');

        const { itemName, itemPrice } = req.body;
        if (itemName == undefined && itemPrice == undefined) {
            return res.status(400).send('itemName or itemPrice is required');
        }

        try {
            const existing = await prisma.orders.findUnique({ where: { id } });
            if (!existing) return res.status(404).send('Order not found');

            const data: { itemName?: string; itemPrice?: any } = {};
            if (itemName != undefined) data.itemName = itemName;
            if (itemPrice != undefined) data.itemPrice = itemPrice;

            const order = await prisma.orders.update({ where: { id }, data });
            return res.status(200).send(order);
        } catch (error: any) {
            console.error('Error updating order: ', error);
            return res.status(500).json({ message: 'Internal Server Error', error: error instanceof Error ? error.message : String(error) });
        }
    }

    static async delete(req: Request, res: Response): Promise<any> {
        const id = Number(req.params.id);
        if (!Number.isInteger(id)) return res.status(400).send('id must be an integer');

        try {
            const existing = await prisma.orders.findUnique({ where: { id } });
            if (!existing) return res.status(404).send('Order not found');

            const orderDeleted = await prisma.orders.delete({ where: { id } });
            return res.status(204).send(orderDeleted);
        } catch (error: any) {
            console.error('Error deleting order: ', error);
            return res.status(500).json({ message: 'Internal Server Error', error: error instanceof Error ? error.message : String(error) });
        }
    }
}

export default OrderController;
