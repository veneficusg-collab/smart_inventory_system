import { Col, Container, Row } from "react-bootstrap";
import { Form, Button, Alert, InputGroup } from "react-bootstrap"; // merged imports
import Modal from "react-bootstrap/Modal";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import BarcodeModal from "./barcode-modal";
import { LuScanBarcode, LuPlus, LuCheck, LuX } from "react-icons/lu"; // ← NEW icons

const MainAddProduct = ({ setRender }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [barcodeModalShow, setBarcodeModalShow] = useState(false);

  // Form state
  const [productName, setProductName] = useState("");
  const [productBrand, setProductBrand] = useState("");
  const [productId, setProductId] = useState(""); // ← fix
  const [category, setCategory] = useState(""); // ← fix
  const [buyingPrice, setBuyingPrice] = useState("");
  const [supplierPrice, setSupplierPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState(""); // ← fix
  const [supplierName, setSupplierName] = useState(""); // ← fix
  const [supplierNumber, setSupplierNumber] = useState(""); // ← fix
  const [expiryDate, setExpiryDate] = useState(""); // safer than null

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ✅ Product ID check state
  const [prodIdStatus, setProdIdStatus] = useState("idle"); // 'idle' | 'checking' | 'exists' | 'available'
  const [prodIdMsg, setProdIdMsg] = useState("");

  // ====== BRAND DROPDOWN STATE (NEW) ======
  const [brandList, setBrandList] = useState([]); // available brands
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandError, setBrandError] = useState("");
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");

  // ====== CATEGORY DROPDOWN STATE ======
  const [categoryList, setCategoryList] = useState([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // ====== SUPPLIER DROPDOWN STATE ======
  const [supplierList, setSupplierList] = useState([]);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [supplierError, setSupplierError] = useState("");
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");

  // Map supplier name -> most common number from products
  const [supplierPhoneByName, setSupplierPhoneByName] = useState({});

  useEffect(() => {
    fetchBrands();
    fetchCategories();
    fetchSuppliers();
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
    }, 500); // debounce 0.5s

    return () => clearTimeout(delay);
  }, [productId]);

  useEffect(() => {
    const sp = parseFloat(supplierPrice);
    if (!isNaN(sp)) {
      // ✅ Supplier price + 10%
      const suggested = sp + sp * 0.1;
      setBuyingPrice(suggested.toFixed(2));
    } else {
      setBuyingPrice("");
    }
  }, [supplierPrice]);

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
    setSupplierName(name); // select the new supplier
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
        .select("supplier_name, supplier_number"); // no .or(), we'll filter in JS

      if (error) throw error;

      const namesSet = new Map(); // case-insensitive de-dupe for names
      const freq = {}; // { nameLower: { number: count } }

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

      // Build mapping: most frequent number per supplier name
      const mapping = {};
      for (const [nameLower, counts] of Object.entries(freq)) {
        const best = Object.entries(counts).sort(
          (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
        )[0]?.[0];
        if (best) mapping[namesSet.get(nameLower)] = best; // keep original casing
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

  // ====== LOAD CATEGORIES FROM SUPABASE ======
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
    setCategory(name); // select the new category
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

      // Pull all product_brand values, de-dup on the client
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

      // No DB insert — brands list comes from products table.
      const updated = Array.from(new Set([...brandList, name])).sort((a, b) =>
        a.localeCompare(b)
      );

      setBrandList(updated);
      setProductBrand(name); // pick the new brand
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

      const { data, error } = await supabase.storage
        .from("Smart-Inventory-System-(Pet Matters)") // Make sure this bucket exists in your Supabase Storage
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
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
        throw new Error("Valid buying price is required");
      if (!quantity || quantity <= 0)
        throw new Error("Valid quantity is required");

      let imageUrl = null;
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
      }

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
        product_img: imageUrl,
        created_at: new Date().toISOString(),
      };

      const { data: insertedProducts, error: insertError } = await supabase
        .from("main_stock_room_products")
        .insert([productData])
        .select();

      if (insertError) throw insertError;

      setSuccess("Product added successfully!");
      setTimeout(() => {
        setRender("product");
      }, 2000);
    } catch (error) {
      console.error("Error adding product:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

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
    }, 500); // debounce 0.5s

    return () => clearTimeout(delay);
  }, [productId]);

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

    // Leave brand view as-is to avoid surprise toggling
  };

  return (
    <Container
      fluid
      className="bg-white mx-5 my-4 rounded d-flex flex-column"
      style={{ width: "135vh", minHeight: "80vh" }}
    >
      <div className="d-flex flex-column align-items-center mb-4">
        <span className="mx-0 mt-5 mb-2 d-inline-block h4">Add Product</span>
      </div>

      {/* Success/Error Messages */}
      {error && (
        <Alert variant="danger" className="mx-4">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" className="mx-4">
          {success}
        </Alert>
      )}
      {/* Brand errors (local to brand actions) */}
      {brandError && (
        <Alert variant="warning" className="mx-4">
          {brandError}
        </Alert>
      )}

      {barcodeModalShow && (
        <BarcodeModal
          show={barcodeModalShow}
          setBarcodeModalShow={setBarcodeModalShow}
          setProductId={setProductId}
        />
      )}

      {/* Form content - takes available space */}
      <div className="flex-grow-1">
        <Form onSubmit={handleAddProductButton}>
          <Row>
            <Col md={6}>
              <div className="ms-5">
                <Form.Group
                  as={Row}
                  className="mb-3 mt-4"
                  controlId="formProductId"
                >
                  <Form.Label column sm={3} className="text-start">
                    Product ID
                  </Form.Label>
                  <Col sm={9}>
                    <InputGroup size="sm">
                      <Form.Control
                        type="text"
                        placeholder="Enter product ID"
                        value={productId}
                        onChange={(e) => setProductId(e.target.value)}
                        required
                      />
                      <Button
                        variant="outline-secondary"
                        onClick={() => setBarcodeModalShow(true)}
                      >
                        <LuScanBarcode />
                      </Button>
                    </InputGroup>
                    {prodIdMsg && (
                      <div
                        style={{
                          fontSize: "0.8rem",
                          marginTop: "4px",
                          color: prodIdStatus === "exists" ? "red" : "green",
                        }}
                      >
                        {prodIdMsg}
                      </div>
                    )}
                  </Col>
                </Form.Group>

                {/* ====== BRAND FIELD (REPLACED) ====== */}
                <Form.Group
                  as={Row}
                  className="mb-3 mt-4"
                  controlId="formProductBrand"
                >
                  <Form.Label column sm={3} className="text-start">
                    Product Brand
                  </Form.Label>
                  <Col sm={9}>
                    {!isAddingBrand ? (
                      <InputGroup size="sm">
                        <Form.Select
                          value={productBrand}
                          onChange={(e) => setProductBrand(e.target.value)}
                          disabled={brandLoading}
                          required
                        >
                          <option value="" disabled>
                            {brandLoading
                              ? "Loading brands..."
                              : "Select brand"}
                          </option>
                          {brandList.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </Form.Select>
                        <Button
                          variant="outline-secondary"
                          title="Add a new brand"
                          onClick={() => {
                            setIsAddingBrand(true);
                            setTimeout(() => {
                              // optional: focus the text field once it renders
                              const el =
                                document.getElementById("newBrandInput");
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
                          placeholder="Type new brand name"
                          value={newBrandName}
                          onChange={(e) => setNewBrandName(e.target.value)}
                          disabled={brandLoading}
                        />
                        <Button
                          variant="outline-success"
                          title="Save brand"
                          onClick={handleSaveNewBrand}
                          disabled={brandLoading || !newBrandName.trim()}
                        >
                          <LuCheck />
                        </Button>
                        <Button
                          variant="outline-secondary"
                          title="Cancel"
                          onClick={handleCancelAddBrand}
                          disabled={brandLoading}
                        >
                          <LuX />
                        </Button>
                      </InputGroup>
                    )}
                  </Col>
                </Form.Group>
                {/* ====== END BRAND FIELD ====== */}
                {/* ====== CATEGORY FIELD ====== */}
                <Form.Group
                  as={Row}
                  className="mb-3 mt-4"
                  controlId="formCategory"
                >
                  <Form.Label column sm={3} className="text-start">
                    Category
                  </Form.Label>
                  <Col sm={9}>
                    {!isAddingCategory ? (
                      <InputGroup size="sm">
                        <Form.Select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          disabled={categoryLoading}
                        >
                          <option value="" disabled>
                            {categoryLoading
                              ? "Loading categories..."
                              : "Select category"}
                          </option>
                          {categoryList.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </Form.Select>
                        <Button
                          variant="outline-secondary"
                          title="Add a new category"
                          onClick={() => {
                            setIsAddingCategory(true);
                            setTimeout(() => {
                              const el =
                                document.getElementById("newCategoryInput");
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
                          placeholder="Type new category name"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          disabled={categoryLoading}
                        />
                        <Button
                          variant="outline-success"
                          title="Save category"
                          onClick={handleSaveNewCategory}
                          disabled={categoryLoading || !newCategoryName.trim()}
                        >
                          <LuCheck />
                        </Button>
                        <Button
                          variant="outline-secondary"
                          title="Cancel"
                          onClick={handleCancelAddCategory}
                          disabled={categoryLoading}
                        >
                          <LuX />
                        </Button>
                      </InputGroup>
                    )}
                  </Col>
                </Form.Group>
                {/* ====== END CATEGORY FIELD ====== */}

                <Form.Group
                  as={Row}
                  className="mb-3 mt-4"
                  controlId="formProductName"
                >
                  <Form.Label column sm={3} className="text-start">
                    Product Name
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control
                      type="text"
                      placeholder="Enter product name"
                      size="sm"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      required
                    />
                  </Col>
                </Form.Group>
                <Form.Group
                  as={Row}
                  className="mb-3 mt-4"
                  controlId="formBuyingPrice"
                >
                  <Form.Label column sm={3} className="text-start">
                    Supplier Price
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter supplier price"
                      size="sm"
                      value={supplierPrice}
                      onChange={(e) => setSupplierPrice(e.target.value)}
                      required
                    />
                  </Col>
                </Form.Group>

                <Form.Group
                  as={Row}
                  className="mb-3 mt-4"
                  controlId="formBuyingPrice"
                >
                  <Form.Label column sm={3} className="text-start">
                    Buying Price
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Enter buying price"
                      size="sm"
                      value={buyingPrice}
                      onChange={(e) => setBuyingPrice(e.target.value)}
                      required
                    />
                    {!supplierPrice || isNaN(parseFloat(supplierPrice)) ? (
                      <Form.Text className="text-muted">
                        Enter Supplier Price first to get a Buying Price
                        suggestion (10%).
                      </Form.Text>
                    ) : (
                      <Form.Text className="text-muted">
                        Suggested Buying Price (10% added):{" "}
                        {(
                          parseFloat(supplierPrice) +
                          parseFloat(supplierPrice) * 0.1
                        ).toFixed(2)}{" "}
                        — auto-filled above, you can override.
                      </Form.Text>
                    )}
                  </Col>
                </Form.Group>

                <Form.Group
                  as={Row}
                  className="mb-3 mt-4"
                  controlId="formQuantity"
                >
                  <Form.Label column sm={3} className="text-start">
                    Quantity
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control
                      type="number"
                      min="0"
                      placeholder="Enter quantity"
                      size="sm"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                    />
                  </Col>
                </Form.Group>

                <Form.Group as={Row} className="mb-3 mt-4" controlId="formUnit">
                  <Form.Label column sm={3} className="text-start">
                    Unit
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control
                      type="text"
                      placeholder="Enter product unit (e.g., kg, pcs, liters)"
                      size="sm"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                    />
                  </Col>
                </Form.Group>

                <Form.Group
                  as={Row}
                  className="mb-3 mt-4"
                  controlId="formExpiryDate"
                >
                  <Form.Label column sm={3} className="text-start">
                    Expiry Date
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control
                      type="date"
                      size="sm"
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                    />
                  </Col>
                </Form.Group>

                {/* ====== SUPPLIER NAME FIELD ====== */}
                <Form.Group
                  as={Row}
                  className="mb-3 mt-4"
                  controlId="formSupplierName"
                >
                  <Form.Label column sm={3} className="text-start">
                    Supplier Name
                  </Form.Label>
                  <Col sm={9}>
                    {!isAddingSupplier ? (
                      <InputGroup size="sm">
                        <Form.Select
                          value={supplierName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSupplierName(val);
                            const suggested = supplierPhoneByName[val];
                            if (suggested && !supplierNumber) {
                              // only fill if empty
                              setSupplierNumber(suggested);
                            }
                          }}
                          disabled={supplierLoading}
                        >
                          <option value="" disabled>
                            {supplierLoading
                              ? "Loading suppliers..."
                              : "Select supplier"}
                          </option>
                          {supplierList.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </Form.Select>
                        <Button
                          variant="outline-secondary"
                          title="Add a new supplier"
                          onClick={() => {
                            setIsAddingSupplier(true);
                            setTimeout(() => {
                              const el =
                                document.getElementById("newSupplierInput");
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
                          placeholder="Type new supplier name"
                          value={newSupplierName}
                          onChange={(e) => setNewSupplierName(e.target.value)}
                          disabled={supplierLoading}
                        />
                        <Button
                          variant="outline-success"
                          title="Save supplier"
                          onClick={handleSaveNewSupplier}
                          disabled={supplierLoading || !newSupplierName.trim()}
                        >
                          <LuCheck />
                        </Button>
                        <Button
                          variant="outline-secondary"
                          title="Cancel"
                          onClick={handleCancelAddSupplier}
                          disabled={supplierLoading}
                        >
                          <LuX />
                        </Button>
                      </InputGroup>
                    )}
                    {supplierError && (
                      <div className="mt-2">
                        <Alert variant="warning" className="py-1 px-2 mb-0">
                          {supplierError}
                        </Alert>
                      </div>
                    )}
                  </Col>
                </Form.Group>
                {/* ====== END SUPPLIER NAME FIELD ====== */}

                {/* ====== SUPPLIER # FIELD (TEXT INPUT) ====== */}
                <Form.Group
                  as={Row}
                  className="mb-3 mt-4"
                  controlId="formSupplierNumber"
                >
                  <Form.Label column sm={3} className="text-start">
                    Supplier #
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Control
                      type="text"
                      placeholder="Enter supplier #"
                      size="sm"
                      value={supplierNumber}
                      onChange={(e) => setSupplierNumber(e.target.value)}
                    />
                  </Col>
                </Form.Group>
                {/* ====== END SUPPLIER # FIELD ====== */}
              </div>
            </Col>

            <Col md={5}>
              <div className="ms-3 mt-4">
                <Form.Group className="mb-4">
                  <Form.Label className="mb-3">Product Image</Form.Label>
                  <div
                    className={`border border-1 rounded p-4 text-center position-relative ${
                      dragActive ? "border-primary bg-light" : "border-dark"
                    }`}
                    style={{ minHeight: "365px", cursor: "pointer" }}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() =>
                      document.getElementById("imageInput").click()
                    }
                  >
                    <input
                      id="imageInput"
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      style={{ display: "none" }}
                    />

                    {imagePreview ? (
                      <div className="d-flex flex-column align-items-center justify-content-center h-100">
                        <div className="position-relative d-inline-block">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="img-fluid rounded"
                            style={{ maxHeight: "250px" }}
                          />
                          <Button
                            variant="danger"
                            size="sm"
                            className="position-absolute top-0 end-0 m-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage();
                            }}
                            style={{ fontSize: "10px" }}
                          >
                            ×
                          </Button>
                        </div>
                        <div className="mt-2">
                          <small className="text-muted">
                            {selectedImage?.name}
                          </small>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="d-flex flex-column align-items-center justify-content-center w-100 h-100"
                        style={{ minHeight: "300px" }}
                      >
                        <svg
                          width="48"
                          height="48"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1"
                          className="text-muted mb-2"
                        >
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                          />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21,15 16,10 5,21" />
                        </svg>
                        <p className="mb-1 text-muted text-center">
                          <strong>Click to upload</strong> or drag and drop
                        </p>
                        <p className="text-muted small text-center">
                          PNG, JPG, GIF up to 10MB
                        </p>
                      </div>
                    )}
                  </div>
                </Form.Group>
              </div>
            </Col>
          </Row>

          {/* Buttons fixed at bottom-right */}
          <div className="d-flex justify-content-end align-items-end p-3">
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
              variant="secondary"
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
            >
              {loading ? "Adding Product..." : "Add Product"}
            </Button>
          </div>
        </Form>
      </div>
    </Container>
  );
};

export default MainAddProduct;
