import { useState } from "react";
import AddProduct from "./Add-Product";
import ProductInfo from "./Product-Info";
import Products from "./Products";
import Restock from "./Restock";
import Unstock from "./Unstock";


const Inventory = () => {
  const [render, setRender] = useState('products');
  const [Id, setID] = useState('');
  const [product, setProduct] = useState(null);
  return (
    <div>
        
        {render === 'products' ? (
        <Products setRender={setRender} setProduct={setProduct} setID={setID} />
      ) : render === 'Add-Product' ? (
        <AddProduct setRender={setRender} />
      ) : render === 'product-info' ? (
        <ProductInfo setRender={setRender} product={product} />
      ) : render === 'restock' ? (
        <Restock setRender={setRender} Id={Id} />
      ) : render === 'unstock' ? (
        <Unstock setRender={setRender} Id={Id}/>
      ) : (
        // Fallback to products view if render state is invalid
        <Products setRender={setRender} setProduct={setProduct} setID={setID} />
      )}
    </div>
  );
};

export default Inventory;
