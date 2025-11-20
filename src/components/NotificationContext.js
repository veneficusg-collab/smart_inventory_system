import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabaseClient';

const NotificationContext = createContext();

// Sound notification utility
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
};

// Browser notification utility
const showBrowserNotification = (title, body, icon = null) => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: icon || '/notification-icon.png',
      badge: '/badge-icon.png',
      tag: 'notification-' + Date.now(),
    });
  }
};

export const NotificationProvider = ({ children }) => {
  const [notificationData, setNotificationData] = useState({
    logs: [],
    retrievals: [],
    alerts: []
  });
  
  const [readNotificationIds, setReadNotificationIds] = useState(() => {
    try {
      const saved = localStorage.getItem('readNotifications');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (err) {
      console.error('Error loading read notifications:', err);
      return new Set();
    }
  });
  
  const [unreadCount, setUnreadCount] = useState(0);
  const isInitialMount = useRef(true);
  const channelsRef = useRef([]);

  // Request browser notification permission on mount
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Save to localStorage whenever readNotificationIds changes
  useEffect(() => {
    try {
      localStorage.setItem('readNotifications', JSON.stringify([...readNotificationIds]));
    } catch (err) {
      console.error('Error saving read notifications:', err);
    }
  }, [readNotificationIds]);

  // Calculate unread count whenever notification data or read IDs change
  useEffect(() => {
    const allIds = [
      ...notificationData.logs.map(l => l.id),
      ...notificationData.retrievals.map(r => r.id),
      ...notificationData.alerts.map(a => a.id)
    ];
    
    const unread = allIds.filter(id => !readNotificationIds.has(id)).length;
    
    console.log('📊 Unread count calculation:', {
      totalLogs: notificationData.logs.length,
      totalRetrievals: notificationData.retrievals.length,
      totalAlerts: notificationData.alerts.length,
      totalNotifications: allIds.length,
      readCount: readNotificationIds.size,
      unreadCount: unread
    });
    
    setUnreadCount(unread);
  }, [notificationData, readNotificationIds]);

  // Fetch all notifications
  const fetchAllNotifications = useCallback(async () => {
    try {
      console.log('🔄 Fetching all notifications...');
      
      // Fetch logs
      const { data: logs, error: logsError } = await supabase
        .from("logs")
        .select("id, product_name, product_action, staff, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      // Fetch retrievals
      const { data: retrievals, error: retrievalsError } = await supabase
        .from("main_retrievals")
        .select("id, staff_name, items, retrieved_at, status")
        .order("retrieved_at", { ascending: false })
        .limit(100);

      if (retrievalsError) throw retrievalsError;

      // Fetch products for alerts
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

      const { data: expirationData, error: expirationError } = await supabase
        .from("products")
        .select("product_ID, product_name, product_quantity, product_expiry, product_img")
        .lte("product_expiry", threeMonthsFromNow.toISOString())
        .not("product_expiry", "is", null)
        .gt("product_quantity", 0);

      if (expirationError) throw expirationError;

      const { data: lowStockData, error: lowStockError } = await supabase
        .from("products")
        .select("product_ID, product_name, product_quantity, product_img")
        .lt("product_quantity", 20)
        .order("product_quantity", { ascending: true });

      if (lowStockError) throw lowStockError;

      // Create alert objects with UNIQUE IDs
      const expirationAlerts = (expirationData || []).map((item) => {
        const daysLeft = Math.ceil(
          (new Date(item.product_expiry) - new Date()) / (1000 * 60 * 60 * 24)
        );
        const severity = daysLeft <= 0 ? "critical" : daysLeft <= 7 ? "high" : daysLeft <= 30 ? "medium" : "low";

        return {
          id: `expiry_${item.product_ID}`, // Changed prefix to 'expiry' for uniqueness
          type: "near_expiration",
          title: "Expiring Soon",
          product_name: item.product_name,
          product_quantity: item.product_quantity,
          message: `Expires in ${daysLeft} days`,
          severity: severity,
          timestamp: item.product_expiry,
          productId: item.product_ID,
          product_img: item.product_img,
        };
      });

      const stockAlerts = (lowStockData || []).map((item) => {
        const severity = item.product_quantity === 0 ? "critical" : item.product_quantity < 5 ? "high" : "medium";

        return {
          id: `lowstock_${item.product_ID}`, // Changed prefix to 'lowstock' for uniqueness
          type: "low_stock",
          title: "Low Stock",
          product_name: item.product_name,
          product_quantity: item.product_quantity,
          message: `${item.product_quantity} units left`,
          severity: severity,
          timestamp: new Date().toISOString(),
          productId: item.product_ID,
          product_img: item.product_img,
        };
      });

      // Combine and deduplicate alerts - same product can have both stock and expiry alerts
      const allAlerts = [...expirationAlerts, ...stockAlerts].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      // Verify no duplicate IDs
      const alertIds = allAlerts.map(a => a.id);
      const uniqueAlertIds = new Set(alertIds);
      if (alertIds.length !== uniqueAlertIds.size) {
        console.warn('⚠️ Duplicate alert IDs detected!', alertIds);
      }

      setNotificationData({
        logs: logs || [],
        retrievals: retrievals || [],
        alerts: allAlerts
      });

      console.log('✅ Notifications fetched:', {
        logs: logs?.length || 0,
        retrievals: retrievals?.length || 0,
        alerts: allAlerts.length,
        uniqueAlertIds: uniqueAlertIds.size
      });

    } catch (error) {
      console.error("❌ Error fetching notifications:", error);
    }
  }, []);

  // Initial load and setup real-time subscriptions
  useEffect(() => {
    let isMounted = true;

    // Initial fetch
    fetchAllNotifications();

    // Mark initial load complete after delay
    setTimeout(() => {
      isInitialMount.current = false;
      console.log('✅ Initial mount complete');
    }, 2000);

    // Setup real-time listeners
    console.log('🔌 Setting up real-time subscriptions...');

    // Clean up existing channels
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];

    // Logs subscription
    const logsChannel = supabase
      .channel("logs-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "logs" },
        (payload) => {
          if (!isMounted) return;
          console.log('🔔 Logs table changed:', payload.eventType);
          
          // Re-fetch all notifications
          fetchAllNotifications();
          
          // Play sound and notification for inserts only
          if (payload.eventType === 'INSERT' && !isInitialMount.current) {
            playNotificationSound();
            showBrowserNotification(
              'Inventory Update',
              `${payload.new.staff || 'Someone'} ${payload.new.product_action || 'updated'} ${payload.new.product_name || 'a product'}`
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Logs subscription status:', status);
      });

    // Retrievals subscription
    const retrievalsChannel = supabase
      .channel("retrievals-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "main_retrievals" },
        (payload) => {
          if (!isMounted) return;
          console.log('🔔 Retrievals table changed:', payload.eventType);
          
          // Re-fetch all notifications
          fetchAllNotifications();
          
          // Play sound and notification for inserts only
          if (payload.eventType === 'INSERT' && !isInitialMount.current) {
            playNotificationSound();
            const itemCount = payload.new.items?.length || 0;
            showBrowserNotification(
              'New Retrieval',
              `${payload.new.staff_name || 'Someone'} retrieved ${itemCount} item${itemCount !== 1 ? 's' : ''}`
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Retrievals subscription status:', status);
      });

    // Products subscription
    const productsChannel = supabase
      .channel("products-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        (payload) => {
          if (!isMounted) return;
          console.log('🔔 Products table changed:', payload.eventType);
          
          // Re-fetch all notifications
          fetchAllNotifications();
          
          // Play sound for product changes (after initial mount)
          if (!isInitialMount.current) {
            playNotificationSound();
            showBrowserNotification(
              'Product Alert',
              'Stock or expiration alert updated'
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Products subscription status:', status);
      });

    channelsRef.current = [logsChannel, retrievalsChannel, productsChannel];

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up subscriptions');
      isMounted = false;
      channelsRef.current.forEach(channel => {
        supabase.removeChannel(channel);
      });
    };
  }, [fetchAllNotifications]);

  // Mark notifications as read
  const markAsRead = useCallback((ids = []) => {
    setReadNotificationIds(prev => {
      if (ids.length === 0) {
        // Mark all as read
        const allIds = [
          ...notificationData.logs.map(l => l.id),
          ...notificationData.retrievals.map(r => r.id),
          ...notificationData.alerts.map(a => a.id)
        ];
        console.log('✓ Marking all as read:', allIds.length);
        return new Set([...prev, ...allIds]);
      } else {
        // Mark specific IDs as read
        const validIds = ids.filter(id => id && !prev.has(id));
        if (validIds.length === 0) return prev;
        console.log('✓ Marking as read:', validIds);
        return new Set([...prev, ...validIds]);
      }
    });
  }, [notificationData]);

  // Clear all read notifications
  const clearReadNotifications = useCallback(() => {
    console.log('🗑️ Clearing all read notifications');
    setReadNotificationIds(new Set());
    localStorage.removeItem('readNotifications');
  }, []);

  // Get all notification IDs
  const allNotificationIds = new Set([
    ...notificationData.logs.map(l => l.id),
    ...notificationData.retrievals.map(r => r.id),
    ...notificationData.alerts.map(a => a.id)
  ]);

  const value = {
    allNotificationIds,
    readNotificationIds,
    unreadCount,
    markAsRead,
    clearReadNotifications,
    notificationData,
    refreshNotifications: fetchAllNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};