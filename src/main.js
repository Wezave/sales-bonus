/**
 * Функция для расчета выручки
 * @param {Object} purchase запись о покупке
 * @param {Object} _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
   const discount = 1 - (purchase.discount / 100);
   return purchase.sale_price * purchase.quantity * discount;
}

/**
 * Функция для расчета бонусов
 * @param {number} index порядковый номер в отсортированном массиве
 * @param {number} total общее число продавцов
 * @param {Object} seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
    if (index === 0) {
        return seller.profit * 0.15;
    } else if (index === 1 || index === 2) {
        return seller.profit * 0.10;
    } else if (index === total - 1) {
        return 0;
    } else {
        return seller.profit * 0.05;
    }
}

/**
 * Функция для анализа данных продаж
 * @param {Object} data
 * @param {Object} options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
    if (!data || typeof data !== 'object') {
        throw new Error('Некорректные входные данные');
    }
    
    if (!Array.isArray(data.sellers) || data.sellers.length === 0) {
        throw new Error('Некорректные входные данные');
    }

    if (!Array.isArray(data.products) || data.products.length === 0) {
        throw new Error('Некорректные входные данные');
    }

    if (!Array.isArray(data.purchase_records)) {
        throw new Error('Некорректные входные данные');
    }

    if (!options || typeof options !== 'object') {
        throw new Error('Чего-то не хватает');
    }

    const { calculateRevenue, calculateBonus } = options;
    
    if (typeof calculateRevenue !== 'function' || typeof calculateBonus !== 'function') {
        throw new Error('Чего-то не хватает');
    }

    const sellerStats = data.sellers.map(seller => ({
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        top_products: [],
        bonus: 0,
        products_sold: {},
    }));
    
    const sellerIndex = Object.fromEntries(sellerStats.map(item => [item.seller_id, item]));
    const productIndex = Object.fromEntries(data.products.map(item => [item.sku, item]));
    
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        
        if (!seller) {
            return;
        }
        
        seller.sales_count += 1;
        seller.revenue += record.total_amount;

        record.items.forEach(item => {
            const product = productIndex[item.sku];
            
            if (!product) {
                return;
            }
            
            const cost = product.purchase_price * item.quantity;
            const revenue = calculateRevenue(item, product);
            const profit = revenue - cost;
            
            seller.profit += profit;

            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });
    
    sellerStats.sort((firstSeller, secondSeller) => secondSeller.profit - firstSeller.profit);

    sellerStats.forEach((seller, index) => {
        seller.bonus = calculateBonus(index, sellerStats.length, seller);
        
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((firstItem, secondItem) => secondItem.quantity - firstItem.quantity)
            .slice(0, 10);
    });

    return sellerStats.map(seller => ({
        seller_id: seller.seller_id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2),
    }));
}