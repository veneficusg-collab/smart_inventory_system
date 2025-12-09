import { Col, Container, Row } from "react-bootstrap";
import { Form, Button, Alert, InputGroup, Card } from "react-bootstrap";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import BarcodeModal from "./barcode-modal";
import { LuScanBarcode, LuPlus, LuCheck, LuX, LuImage, LuUpload } from "react-icons/lu";

const MainAddProduct = ({ setRender }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [barcodeModalShow, setBarcodeModalShow] = useState(false);

  // Form state
  const [productName, setProductName] = useState("");
  const [productBrand, setProductBrand] = useState("");
  const [productId, setProductId] = useState("");
  const [category, setCategory] = useState("");
  const [buyingPrice, setBuyingPrice] = useState("");
  const [vat, setVAT] = useState("");
  const [supplierPrice, setSupplierPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [supplierNumber, setSupplierNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Product ID check state
  const [prodIdStatus, setProdIdStatus] = useState("idle");
  const [prodIdMsg, setProdIdMsg] = useState("");

  // Brand dropdown state
  const [brandList, setBrandList] = useState([]);
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandError, setBrandError] = useState("");
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");

  // Category dropdown state
  const [categoryList, setCategoryList] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Supplier dropdown state
  const [supplierList, setSupplierList] = useState([]);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [supplierError, setSupplierError] = useState("");
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");

  // Map supplier name -> most common number from products
  const [supplierPhoneByName, setSupplierPhoneByName] = useState({});

  // Get today's date in YYYY-MM-DD format for min date attribute
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [minDate, setMinDate] = useState(getTodayDate());

  useEffect(() => {
    fetchBrands();
    fetchCategories();
    fetchSuppliers();
    
    // Update minDate on component mount to ensure it's always current
    setMinDate(getTodayDate());
  }, []);

  useEffect(() => {
    if (!productId.trim()) {
      setProdIdStatus("idle");
      setProdIdMsg("");
      return;
    }

    const delay = setTimeout(async () => {
      setProdIdStatus("checking");
      setProdIdMsg("Checking Product ID...");

      const { data, error } = await supabase
        .from("main_stock_room_products")
        .select("product_ID")
        .eq("product_ID", productId.trim())
        .maybeSingle();

      if (error) {
        console.error("Error checking Product ID:", error);
        setProdIdStatus("idle");
        setProdIdMsg("");
        return;
      }

      if (data) {
        setProdIdStatus("exists");
        setProdIdMsg("❌ Product ID already exists!");
      } else {
        setProdIdStatus("available");
        setProdIdMsg("✅ Product ID is available");
      }
    }, 500);

    return () => clearTimeout(delay);
  }, [productId]);

  useEffect(() => {
    const sp = parseFloat(supplierPrice);

    if (!isNaN(sp)) {
      const vatAmount = sp * 0.12;
      setVAT(vatAmount.toFixed(2));
      setBuyingPrice((sp + vatAmount).toFixed(2));
    } else {
      setVAT("");
      setBuyingPrice("");
    }
  }, [supplierPrice]);

  // Function to validate expiry date
  const validateExpiryDate = (dateString) => {
    if (!dateString) return true; // Empty is okay (optional field)
    
    const selectedDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to compare dates only
    
    return selectedDate >= today;
  };

  const getCurrentStaffName = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.id) {
        const { data: staff, error } = await supabase
          .from("staff")
          .select("staff_name")
          .eq("id", user.id)
          .limit(1)
          .single();
        if (!error && staff) return staff.staff_name || "Unknown";
      }
    } catch (_) {}
    try {
      const stored = localStorage.getItem("user");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed?.staff_name || parsed?.staff_barcode || "Unknown";
      }
    } catch (_) {}
    return "Unknown";
  };

  const handleSaveNewSupplier = () => {
    const name = newSupplierName.trim();
    if (!name) {
      setSupplierError("Supplier name cannot be empty.");
      return;
    }

    const updated = Array.from(new Set([...supplierList, name])).sort((a, b) =>
      a.localeCompare(b)
    );
    setSupplierList(updated);
    setSupplierName(name);
    setIsAddingSupplier(false);
    setNewSupplierName("");
  };

  const handleCancelAddSupplier = () => {
    setIsAddingSupplier(false);
    setNewSupplierName("");
    setSupplierError("");
  };

  const fetchSuppliers = async () => {
    try {
      setSupplierError("");
      setSupplierLoading(true);

      const { data, error } = await supabase
        .from("main_stock_room_products")
        .select("supplier_name, supplier_number");

      if (error) throw error;

      const namesSet = new Map();
      const freq = {};

      (data || []).forEach((r) => {
        const name = (r.supplier_name || "").trim();
        const num = (r.supplier_number || "").trim();

        if (name) {
          const key = name.toLowerCase();
          if (!namesSet.has(key)) namesSet.set(key, name);
          if (num) {
            if (!freq[key]) freq[key] = {};
            freq[key][num] = (freq[key][num] || 0) + 1;
          }
        }
      });

      const mapping = {};
      for (const [nameLower, counts] of Object.entries(freq)) {
        const best = Object.entries(counts).sort(
          (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
        )[0]?.[0];
        if (best) mapping[namesSet.get(nameLower)] = best;
      }

      setSupplierPhoneByName(mapping);

      const names = Array.from(namesSet.values()).sort((a, b) =>
        a.localeCompare(b)
      );
      setSupplierList(names);
    } catch (err) {
      setSupplierError(err.message || "Failed to load suppliers");
    } finally {
      setSupplierLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setCategoryError("");
      setCategoryLoading(true);

      const { data, error } = await supabase
        .from("main_stock_room_products")
        .select("product_category")
        .not("product_category", "is", null);

      if (error) throw error;

      const names = Array.from(
        new Set(
          (data || [])
            .map((r) => (r.product_category || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b));

      setCategoryList(names);
    } catch (err) {
      setCategoryError(err.message || "Failed to load categories");
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleSaveNewCategory = () => {
    const name = newCategoryName.trim();
    if (!name) {
      setCategoryError("Category name cannot be empty.");
      return;
    }

    const updated = Array.from(new Set([...categoryList, name])).sort((a, b) =>
      a.localeCompare(b)
    );
    setCategoryList(updated);
    setCategory(name);
    setIsAddingCategory(false);
    setNewCategoryName("");
  };

  const handleCancelAddCategory = () => {
    setIsAddingCategory(false);
    setNewCategoryName("");
    setCategoryError("");
  };

  const fetchBrands = async () => {
    try {
      setBrandError("");
      setBrandLoading(true);

      const { data, error } = await supabase
        .from("main_stock_room_products")
        .select("product_brand")
        .not("product_brand", "is", null);

      if (error) throw error;

      const names = Array.from(
        new Set(
          (data || [])
            .map((r) => (r.product_brand || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b));

      setBrandList(names);
    } catch (err) {
      setBrandError(err.message || "Failed to load brands");
    } finally {
      setBrandLoading(false);
    }
  };

  const handleSaveNewBrand = async () => {
    const name = newBrandName.trim();
    if (!name) {
      setBrandError("Brand name cannot be empty.");
      return;
    }
    try {
      setBrandError("");
      setBrandLoading(true);

      const updated = Array.from(new Set([...brandList, name])).sort((a, b) =>
        a.localeCompare(b)
      );

      setBrandList(updated);
      setProductBrand(name);
      setIsAddingBrand(false);
      setNewBrandName("");
    } catch (err) {
      setBrandError(err.message || "Failed to add brand");
    } finally {
      setBrandLoading(false);
    }
  };

  const handleCancelAddBrand = () => {
    setIsAddingBrand(false);
    setNewBrandName("");
    setBrandError("");
  };

  // Handles drag events
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handles file drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        handleImageFile(file);
      }
    }
  };

  // Processes the image file
  const handleImageFile = (file) => {
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Handles file selection from the input
  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  };

  // Removes the selected image
  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const handleCancelButton = () => {
    setRender("main-products");
  };

  // Upload image to Supabase Storage
  const uploadImage = async (file) => {
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}_${Math.random()
        .toString(36)
        .substring(2)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error } = await supabase.storage
        .from("Smart-Inventory-System-(Pet Matters)")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("Smart-Inventory-System-(Pet Matters)")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const handleAddProductButton = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validation
      if (!productName.trim()) throw new Error("Product name is required");
      if (!productId.trim()) throw new Error("Product ID is required");

      if (prodIdStatus === "exists") {
        throw new Error("Product ID already exists, please choose another.");
      }

      if (!productBrand.trim()) throw new Error("Product brand is required");
      if (!buyingPrice || buyingPrice <= 0)
        throw new Error("Valid VAT price is required");
      if (!quantity || quantity <= 0)
        throw new Error("Valid quantity is required");

      // Validate expiry date if provided
      if (expiryDate && !validateExpiryDate(expiryDate)) {
        throw new Error("Expiry date cannot be in the past. Please select a future date.");
      }

      let imageUrl = null;
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
      }

      const staffName = await getCurrentStaffName();

      // Prepare product data
      const productData = {
        product_name: productName.trim(),
        product_brand: productBrand.trim(),
        product_ID: productId.trim(),
        product_category: category.trim() || null,
        product_price: parseFloat(buyingPrice),
        product_quantity: parseInt(quantity),
        product_unit: unit.trim() || null,
        supplier_name: supplierName.trim() || null,
        supplier_number: supplierNumber.trim() || null,
        supplier_price: parseFloat(supplierPrice),
        product_expiry: expiryDate || null,
        vat: parseFloat(vat) || null,
        product_img: imageUrl,
        created_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from("main_stock_room_products")
        .insert([productData])
        .select();

      if (insertError) throw insertError;

      const { error: logError } = await supabase.from("logs").insert([
                {
                  product_id: productData.product_ID,
                  product_name: productData.product_name,
                  product_quantity: parseInt(productData.product_quantity, 10),
                  product_category: productData.product_category,
                  product_unit: productData.product_unit,
                  product_expiry: productData.product_expiry,
                  staff: staffName,
                  product_action: "Main Stock Room Add Product",
                },
              ]);
              if (logError) throw logError;
      

      setSuccess("Product added successfully!");
      setTimeout(() => {
        setRender("main-products");
      }, 2000);
    } catch (error) {
      console.error("Error adding product:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset form function
  const resetForm = () => {
    setProductName("");
    setProductBrand("");
    setProductId("");
    setCategory("");
    setBuyingPrice("");
    setQuantity("");
    setUnit("");
    setSupplierName("");
    setSupplierNumber("");
    setExpiryDate("");
    removeImage();
    setError("");
    setSuccess("");
    setSupplierPrice("");
    setIsAddingSupplier(false);
    setNewSupplierName("");
    setSupplierError("");
  };

  return (
    <Container
      fluid
      className="bg-white mx-5 my-4 rounded d-flex flex-column shadow-sm"
      style={{ width: "135vh", minHeight: "80vh" }}
    >
      <Card className="border-0 bg-transparent">
        <Card.Header className="bg-white border-0 pb-0 pt-4">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h3 className="fw-bold text-dark mb-2">Add New Product</h3>
              <p className="text-muted mb-0">Fill in the product details below</p>
            </div>
            <div className="d-flex">
              <Button
                variant="outline-secondary"
                type="button"
                size="sm"
                className="me-2"
                onClick={resetForm}
                disabled={loading}
              >
                Reset
              </Button>
              <Button
                variant="outline-secondary"
                type="button"
                size="sm"
                className="me-2"
                onClick={handleCancelButton}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                type="submit"
                size="sm"
                disabled={loading}
                onClick={handleAddProductButton}
              >
                {loading ? "Adding Product..." : "Add Product"}
              </Button>
            </div>
          </div>

          {/* Success/Error Messages */}
          {error && (
            <Alert variant="danger" className="py-2 mb-3">
              <div className="d-flex align-items-center">
                <span className="me-2">⚠️</span>
                <span>{error}</span>
              </div>
            </Alert>
          )}
          {success && (
            <Alert variant="success" className="py-2 mb-3">
              <div className="d-flex align-items-center">
                <span className="me-2">✅</span>
                <span>{success}</span>
              </div>
            </Alert>
          )}
        </Card.Header>

        <Card.Body className="pt-3">
          {barcodeModalShow && (
            <BarcodeModal
              show={barcodeModalShow}
              setBarcodeModalShow={setBarcodeModalShow}
              setProductId={setProductId}
            />
          )}

          <Form onSubmit={handleAddProductButton}>
            <Row>
              {/* Left Column - Form Fields */}
              <Col md={7}>
                <Row className="g-3">
                  {/* Product ID */}
                  <Col md={6}>
                    <Form.Group controlId="formProductId">
                      <Form.Label className="fw-semibold mb-1">
                        Product ID <span className="text-danger">*</span>
                      </Form.Label>
                      <InputGroup size="sm">
                        <Form.Control
                          type="text"
                          placeholder="Enter product ID"
                          value={productId}
                          onChange={(e) => setProductId(e.target.value)}
                          required
                          className="border-end-0"
                        />
                        <Button
                          variant="outline-primary"
                          onClick={() => setBarcodeModalShow(true)}
                          className="border-start-0"
                          title="Scan barcode"
                        >
                          <LuScanBarcode size={16} />
                        </Button>
                      </InputGroup>
                      {prodIdMsg && (
                        <div
                          className="mt-1 small"
                          style={{
                            color: prodIdStatus === "exists" ? "#dc3545" : "#198754",
                          }}
                        >
                          {prodIdMsg}
                        </div>
                      )}
                    </Form.Group>
                  </Col>

                  {/* Product Name */}
                  <Col md={6}>
                    <Form.Group controlId="formProductName">
                      <Form.Label className="fw-semibold mb-1">
                        Product Name <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Enter product name"
                        size="sm"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        required
                      />
                    </Form.Group>
                  </Col>

                  {/* Brand */}
                  <Col md={6}>
                    <Form.Group controlId="formProductBrand">
                      <Form.Label className="fw-semibold mb-1">
                        Brand <span className="text-danger">*</span>
                      </Form.Label>
                      {!isAddingBrand ? (
                        <InputGroup size="sm">
                          <Form.Select
                            value={productBrand}
                            onChange={(e) => setProductBrand(e.target.value)}
                            disabled={brandLoading}
                            required
                          >
                            <option value="" disabled>
                              {brandLoading ? "Loading..." : "Select brand"}
                            </option>
                            {brandList.map((b) => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                          </Form.Select>
                          <Button
                            variant="outline-secondary"
                            onClick={() => {
                              setIsAddingBrand(true);
                              setTimeout(() => {
                                const el = document.getElementById("newBrandInput");
                                el && el.focus();
                              }, 0);
                            }}
                          >
                            <LuPlus />
                          </Button>
                        </InputGroup>
                      ) : (
                        <InputGroup size="sm">
                          <Form.Control
                            id="newBrandInput"
                            type="text"
                            placeholder="New brand name"
                            value={newBrandName}
                            onChange={(e) => setNewBrandName(e.target.value)}
                            disabled={brandLoading}
                          />
                          <Button
                            variant="outline-success"
                            onClick={handleSaveNewBrand}
                            disabled={brandLoading || !newBrandName.trim()}
                          >
                            <LuCheck />
                          </Button>
                          <Button
                            variant="outline-secondary"
                            onClick={handleCancelAddBrand}
                            disabled={brandLoading}
                          >
                            <LuX />
                          </Button>
                        </InputGroup>
                      )}
                    </Form.Group>
                  </Col>

                  {/* Category */}
                  <Col md={6}>
                    <Form.Group controlId="formCategory">
                      <Form.Label className="fw-semibold mb-1">
                        Category
                      </Form.Label>
                      {!isAddingCategory ? (
                        <InputGroup size="sm">
                          <Form.Select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            disabled={categoryLoading}
                          >
                            <option value="" disabled>
                              {categoryLoading ? "Loading..." : "Select category"}
                            </option>
                            {categoryList.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </Form.Select>
                          <Button
                            variant="outline-secondary"
                            onClick={() => {
                              setIsAddingCategory(true);
                              setTimeout(() => {
                                const el = document.getElementById("newCategoryInput");
                                el && el.focus();
                              }, 0);
                            }}
                          >
                            <LuPlus />
                          </Button>
                        </InputGroup>
                      ) : (
                        <InputGroup size="sm">
                          <Form.Control
                            id="newCategoryInput"
                            type="text"
                            placeholder="New category name"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            disabled={categoryLoading}
                          />
                          <Button
                            variant="outline-success"
                            onClick={handleSaveNewCategory}
                            disabled={categoryLoading || !newCategoryName.trim()}
                          >
                            <LuCheck />
                          </Button>
                          <Button
                            variant="outline-secondary"
                            onClick={handleCancelAddCategory}
                            disabled={categoryLoading}
                          >
                            <LuX />
                          </Button>
                        </InputGroup>
                      )}
                    </Form.Group>
                  </Col>

                  {/* Price Section */}
                  <Col md={4}>
                    <Form.Group controlId="formSupplierPrice">
                      <Form.Label className="fw-semibold mb-1">
                        Supplier Price <span className="text-danger">*</span>
                      </Form.Label>
                      <InputGroup size="sm">
                        <InputGroup.Text className="bg-light">₱</InputGroup.Text>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={supplierPrice}
                          onChange={(e) => setSupplierPrice(e.target.value)}
                          required
                        />
                      </InputGroup>
                    </Form.Group>
                  </Col>

                  <Col md={4}>
                    <Form.Group controlId="formVAT">
                      <Form.Label className="fw-semibold mb-1">
                        VAT (12%)
                      </Form.Label>
                      <InputGroup size="sm">
                        <InputGroup.Text className="bg-light">₱</InputGroup.Text>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={vat}
                          onChange={(e) => setVAT(e.target.value)}
                          required
                        />
                      </InputGroup>
                      <Form.Text className="text-muted small">
                        Auto-calculated from supplier price
                      </Form.Text>
                    </Form.Group>
                  </Col>

                  <Col md={4}>
                    <Form.Group controlId="formBuyingPrice">
                      <Form.Label className="fw-semibold mb-1">
                        SRP <span className="text-danger">*</span>
                      </Form.Label>
                      <InputGroup size="sm">
                        <InputGroup.Text className="bg-light">₱</InputGroup.Text>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={buyingPrice}
                          onChange={(e) => setBuyingPrice(e.target.value)}
                          required
                        />
                      </InputGroup>
                    </Form.Group>
                  </Col>

                  {/* Quantity & Unit */}
                  <Col md={6}>
                    <Form.Group controlId="formQuantity">
                      <Form.Label className="fw-semibold mb-1">
                        Quantity <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        placeholder="Enter quantity"
                        size="sm"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        required
                      />
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group controlId="formUnit">
                      <Form.Label className="fw-semibold mb-1">
                        Unit
                      </Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="kg, pcs, liters, etc."
                        size="sm"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                      />
                    </Form.Group>
                  </Col>

                  {/* Expiry Date */}
                  <Col md={6}>
                    <Form.Group controlId="formExpiryDate">
                      <Form.Label className="fw-semibold mb-1">
                        Expiry Date
                      </Form.Label>
                      <Form.Control
                        type="date"
                        size="sm"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="text-muted"
                        min={minDate}
                      />
                      <Form.Text className="text-muted small">
                        {expiryDate && !validateExpiryDate(expiryDate) ? (
                          <span className="text-danger">
                            ⚠️ Please select a future date
                          </span>
                        ) : (
                          "Select a future date (optional)"
                        )}
                      </Form.Text>
                    </Form.Group>
                  </Col>

                  {/* Supplier Section */}
                  <Col md={6}>
                    <Form.Group controlId="formSupplierName">
                      <Form.Label className="fw-semibold mb-1">
                        Supplier Name
                      </Form.Label>
                      {!isAddingSupplier ? (
                        <InputGroup size="sm">
                          <Form.Select
                            value={supplierName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSupplierName(val);
                              const suggested = supplierPhoneByName[val];
                              if (suggested && !supplierNumber) {
                                setSupplierNumber(suggested);
                              }
                            }}
                            disabled={supplierLoading}
                          >
                            <option value="" disabled>
                              {supplierLoading ? "Loading..." : "Select supplier"}
                            </option>
                            {supplierList.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </Form.Select>
                          <Button
                            variant="outline-secondary"
                            onClick={() => {
                              setIsAddingSupplier(true);
                              setTimeout(() => {
                                const el = document.getElementById("newSupplierInput");
                                el && el.focus();
                              }, 0);
                            }}
                          >
                            <LuPlus />
                          </Button>
                        </InputGroup>
                      ) : (
                        <InputGroup size="sm">
                          <Form.Control
                            id="newSupplierInput"
                            type="text"
                            placeholder="New supplier name"
                            value={newSupplierName}
                            onChange={(e) => setNewSupplierName(e.target.value)}
                            disabled={supplierLoading}
                          />
                          <Button
                            variant="outline-success"
                            onClick={handleSaveNewSupplier}
                            disabled={supplierLoading || !newSupplierName.trim()}
                          >
                            <LuCheck />
                          </Button>
                          <Button
                            variant="outline-secondary"
                            onClick={handleCancelAddSupplier}
                            disabled={supplierLoading}
                          >
                            <LuX />
                          </Button>
                        </InputGroup>
                      )}
                    </Form.Group>
                  </Col>

                  <Col md={6}>
                    <Form.Group controlId="formSupplierNumber">
                      <Form.Label className="fw-semibold mb-1">
                        Supplier Contact
                      </Form.Label>
                      <Form.Control
                        type="text"
                        placeholder="Phone number"
                        size="sm"
                        value={supplierNumber}
                        onChange={(e) => setSupplierNumber(e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Col>

              {/* Right Column - Image Upload */}
              <Col md={5}>
                <Card className="h-100 border">
                  <Card.Body className="d-flex flex-column">
                    <Card.Title className="fw-semibold mb-3 d-flex align-items-center">
                      <LuImage className="me-2" />
                      Product Image
                    </Card.Title>
                    
                    <div
                      className={`flex-grow-1 border-2 border-dashed rounded d-flex flex-column align-items-center justify-content-center p-4 ${
                        dragActive ? "border-primary bg-light" : "border-gray-300"
                      }`}
                      style={{
                        minHeight: "300px",
                        cursor: "pointer",
                        borderStyle: dragActive ? "solid" : "dashed",
                      }}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById("imageInput").click()}
                    >
                      <input
                        id="imageInput"
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        style={{ display: "none" }}
                      />

                      {imagePreview ? (
                        <div className="w-100 h-100 d-flex flex-column align-items-center justify-content-center">
                          <div className="position-relative mb-3">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="img-fluid rounded shadow-sm"
                              style={{ maxHeight: "200px", maxWidth: "100%" }}
                            />
                            <Button
                              variant="danger"
                              size="sm"
                              className="position-absolute top-0 end-0 rounded-circle"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeImage();
                              }}
                              style={{ width: "24px", height: "24px", padding: 0 }}
                            >
                              ×
                            </Button>
                          </div>
                          <div className="text-center">
                            <small className="text-muted d-block">
                              {selectedImage?.name}
                            </small>
                            <small className="text-muted">
                              Click or drag to change image
                            </small>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="mb-3 p-3 bg-light rounded-circle">
                            <LuUpload size={32} className="text-muted" />
                          </div>
                          <h6 className="fw-semibold mb-1">Upload Product Image</h6>
                          <p className="text-muted text-center small mb-3">
                            Drag & drop or click to browse
                          </p>
                          <p className="text-muted small text-center">
                            Supports: PNG, JPG, GIF • Max: 10MB
                          </p>
                        </>
                      )}
                    </div>

                    {!imagePreview && (
                      <div className="mt-3 text-center">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => document.getElementById("imageInput").click()}
                          className="w-100"
                        >
                          <LuUpload className="me-1" />
                          Browse Files
                        </Button>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default MainAddProduct;