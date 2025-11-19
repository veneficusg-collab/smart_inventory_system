// hooks/useProductAlerts.js
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { notificationManager } from "../utils/notificationManager";

const BUCKET = "Smart-Inventory-System-(Pet Matters)";

export const useProductAlerts = () => {
  const [nearExpirationAlerts, setNearExpirationAlerts] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const checkAlerts = async () => {
    try {
      setLoading(true);
      
      // Check near expiration (3 months threshold)
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      
      const { data: expirationData, error: expirationError } = await supabase
        .from("products")
        .select("product_ID, product_name, product_quantity, product_expiry, product_img")
        .lte("product_expiry", threeMonthsFromNow.toISOString())
        .not("product_expiry", "is", null)
        .gt("product_quantity", 0);

      if (expirationError) throw expirationError;

      // Check low stocks
      const { data: lowStockData, error: lowStockError } = await supabase
        .from("products")
        .select("product_ID, product_name, product_quantity, product_img")
        .lt("product_quantity", 20)
        .order("product_quantity", { ascending: true });

      if (lowStockError) throw lowStockError;

      // Process and set alerts
      const expirationAlerts = (expirationData || []).map(item => ({
        ...item,
        type: 'near_expiration',
        severity: getExpirationSeverity(item.product_expiry),
        daysLeft: Math.ceil((new Date(item.product_expiry) - new Date()) / (1000 * 60 * 60 * 24))
      }));

      const stockAlerts = (lowStockData || []).map(item => ({
        ...item,
        type: 'low_stock',
        severity: item.product_quantity === 0 ? 'critical' : item.product_quantity < 5 ? 'high' : 'medium'
      }));

      setNearExpirationAlerts(expirationAlerts);
      setLowStockAlerts(stockAlerts);

      // Send notifications for new critical alerts
      sendCriticalNotifications(expirationAlerts, stockAlerts);

    } catch (error) {
      console.error("Error checking product alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendCriticalNotifications = (expirationAlerts, stockAlerts) => {
    // Notify for items expiring in less than 30 days
    const criticalExpiration = expirationAlerts.filter(item => item.daysLeft <= 30);
    criticalExpiration.forEach(item => {
      notificationManager.notify({
        id: `exp_${item.product_ID}_${Date.now()}`,
        type: 'near_expiration',
        title: 'Product Expiring Soon',
        message: `${item.product_name} expires in ${item.daysLeft} days`,
        productId: item.product_ID,
        severity: 'high',
        timestamp: new Date().toISOString()
      });
    });

    // Notify for very low stock (less than 5)
    const criticalStock = stockAlerts.filter(item => item.product_quantity < 5);
    criticalStock.forEach(item => {
      notificationManager.notify({
        id: `stock_${item.product_ID}_${Date.now()}`,
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: `${item.product_name} has only ${item.product_quantity} units left`,
        productId: item.product_ID,
        severity: item.product_quantity === 0 ? 'critical' : 'high',
        timestamp: new Date().toISOString()
      });
    });
  };

  useEffect(() => {
    checkAlerts();
    
    // Set up real-time monitoring
    const subscription = supabase
      .channel('product-alerts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        () => {
          checkAlerts(); // Re-check alerts on any product change
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    nearExpirationAlerts,
    lowStockAlerts,
    loading,
    refreshAlerts: checkAlerts
  };
};

const getExpirationSeverity = (expiryDate) => {
  const daysLeft = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 0) return 'critical';
  if (daysLeft <= 7) return 'high';
  if (daysLeft <= 30) return 'medium';
  return 'low';
};