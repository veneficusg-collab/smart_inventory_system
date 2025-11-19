import { useEffect, useState } from "react";
import { Badge } from "react-bootstrap";
import { useProductAlerts } from "../hooks/useProductAlerts";

const AlertIndicator = () => {
  const { nearExpirationAlerts, lowStockAlerts } = useProductAlerts();
  
  const criticalAlerts = [
    ...nearExpirationAlerts.filter(alert => alert.severity === 'critical'),
    ...lowStockAlerts.filter(alert => alert.severity === 'critical')
  ];

  const highAlerts = [
    ...nearExpirationAlerts.filter(alert => alert.severity === 'high'),
    ...lowStockAlerts.filter(alert => alert.severity === 'high')
  ];

  if (criticalAlerts.length === 0 && highAlerts.length === 0) {
    return null;
  }

  return (
    <Badge 
      bg={criticalAlerts.length > 0 ? "danger" : "warning"} 
      className="ms-2"
      style={{ cursor: 'pointer' }}
      title={`${criticalAlerts.length} critical, ${highAlerts.length} high priority alerts`}
    >
      ⚠️ {criticalAlerts.length + highAlerts.length}
    </Badge>
  );
};

export default AlertIndicator;