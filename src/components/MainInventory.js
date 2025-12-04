import { useState } from "react";
import AddProduct from "./Add-Product";
import ProductInfo from "./Product-Info";
import Restock from "./Restock";
import Unstock from "./Unstock";
import MainProducts from "./MainProducts";
import MainAddProduct from "./MainAdd-Product";
import MainProductInfo from "./MainProduct-Info";
import MainRestock from "./MainRestock";
import MainUnstock from "./MainUnstock";


const MainInventory = ({staffRole}) => {
  const [render, setRender] = useState('main-products');
  const [Id, setID] = useState('');
  const [product, setProduct] = useState(null);
  return (
    <div>
        {render === 'main-products' ? (
        <MainProducts setRender={setRender} setProduct={setProduct} setID={setID} staffRole={staffRole}  />
      ) : render === 'Main-Add-Product' ? (
        <MainAddProduct setRender={setRender} />
      ) : render === 'main-product-info' ? (
        <MainProductInfo setRender={setRender} product={product} />
      ) : render === 'main-restock' ? (
        <MainRestock setRender={setRender} Id={Id} />
      ) : render === 'main-unstock' ? (
        <MainUnstock setRender={setRender} Id={Id}/>
      ) : (
        // Fallback to products view if render state is invalid
        <MainProducts setRender={setRender} setProduct={setProduct} setID={setID} staffRole={staffRole} />
      )}
    </div>
  );
};

export default MainInventory;
