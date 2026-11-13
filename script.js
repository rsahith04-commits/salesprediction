
"use strict";

// ========================================
// SALESPILOT - APPLICATION CONFIGURATION
// ========================================

const DEMO_USERNAME = "admin";
const DEMO_PASSWORD = "Admin@123";

const $ = (id) => document.getElementById(id);

let products = [];
let sales = [];
let salesChart = null;

// ========================================
// STORAGE
// ========================================

function loadData() {
    try {
        const savedProducts = JSON.parse(
            localStorage.getItem("sp_products") || "null"
        );

        const savedSales = JSON.parse(
            localStorage.getItem("sp_sales") || "[]"
        );

        products = Array.isArray(savedProducts) ? savedProducts : [
            { id: 1, name: "Laptop", price: 50000, stock: 20 },
            { id: 2, name: "Mobile", price: 20000, stock: 30 },
            { id: 3, name: "Headphones", price: 2500, stock: 50 }
        ];

        products = products.map((p, index) => ({
            id: p.id ?? index + 1,
            name: String(p.name ?? p.productName ?? "Product"),
            price: Math.max(0, Number(p.price ?? p.productPrice) || 0),
            stock: Math.max(0, Number(p.stock ?? p.quantity) || 0)
        }));

        sales = (Array.isArray(savedSales) ? savedSales : []).map(s => {
            const qty = Number(
                s.qty ?? s.quantity ?? s.units ?? s.soldQuantity ?? 0
            ) || 0;

            const product = products.find(p =>
                String(p.id) === String(
                    s.pid ?? s.productId ?? s.product_id
                )
            ) || products.find(p =>
                p.name.toLowerCase() === String(
                    s.name ?? s.productName ?? s.product ?? ""
                ).toLowerCase()
            );

            let price = Number(
                s.price ?? s.sellingPrice ?? s.unitPrice ?? s.productPrice
            );

            if (!Number.isFinite(price)) {
                const total = Number(
                    s.totalAmount ?? s.revenue ?? s.amount
                );

                price = Number.isFinite(total) && qty > 0
                    ? total / qty
                    : Number(product?.price || 0);
            }

            return {
                pid: s.pid ?? s.productId ?? s.product_id ?? product?.id,
                name: String(
                    s.name ?? s.productName ?? s.product ?? product?.name ?? "Unknown"
                ),
                qty: Math.max(0, qty),
                price: Math.max(0, price),
                date: s.date ?? s.saleDate ?? s.createdAt ?? new Date().toISOString()
            };
        });

        saveData();

    } catch (error) {
        console.error("Storage loading error:", error);

        products = [
            { id: 1, name: "Laptop", price: 50000, stock: 20 },
            { id: 2, name: "Mobile", price: 20000, stock: 30 },
            { id: 3, name: "Headphones", price: 2500, stock: 50 }
        ];

        sales = [];
        saveData();
    }
}

function saveData() {
    localStorage.setItem("sp_products", JSON.stringify(products));
    localStorage.setItem("sp_sales", JSON.stringify(sales));
}

// ========================================
// HELPERS
// ========================================

function money(value) {
    const amount = Number(value);
    return "₹" + (Number.isFinite(amount) ? amount : 0)
        .toLocaleString("en-IN", {
            maximumFractionDigits: 2
        });
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function getProductSales(productId) {
    return sales.filter(s =>
        String(s.pid) === String(productId)
    );
}

function getProductUnits(productId) {
    return getProductSales(productId).reduce(
        (total, sale) => total + (Number(sale.qty) || 0),
        0
    );
}

// ========================================
// LOGIN
// ========================================

$("loginForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const username = $("loginUsername").value.trim();
    const password = $("loginPassword").value;

    if (
        username === DEMO_USERNAME &&
        password === DEMO_PASSWORD
    ) {
        sessionStorage.setItem("salespilot_logged_in", "yes");

        $("loginError").textContent = "";

        showApplication();
    } else {
        $("loginError").textContent =
            "Incorrect username or password.";
    }
});

function showApplication() {
    $("loginScreen").style.display = "none";
    $("appContent").hidden = false;

    renderApplication();

    setTimeout(renderChart, 100);
}

function showLogin() {
    $("appContent").hidden = true;
    $("loginScreen").style.display = "flex";
    $("loginPassword").value = "";
}

$("logoutButton").addEventListener("click", function() {
    sessionStorage.removeItem("salespilot_logged_in");
    showLogin();
});

// ========================================
// PRODUCT MANAGEMENT
// ========================================

$("productForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const name = $("productName").value.trim();
    const price = Number($("productPrice").value);
    const stock = Number($("productStock").value);

    if (!name || !Number.isFinite(price) || price <= 0 ||
        !Number.isInteger(stock) || stock < 0) {
        alert("Please enter valid product details.");
        return;
    }

    const exists = products.some(p =>
        p.name.toLowerCase() === name.toLowerCase()
    );

    if (exists) {
        alert("This product already exists.");
        return;
    }

    products.push({
        id: Date.now(),
        name,
        price,
        stock
    });

    saveData();
    this.reset();
    $("productStock").value = 20;

    renderApplication();

    alert("Product added successfully!");
});

function deleteProduct(id) {
    const hasSales = sales.some(s =>
        String(s.pid) === String(id)
    );

    if (hasSales) {
        alert("This product has sales history and cannot be deleted.");
        return;
    }

    if (!confirm("Are you sure you want to delete this product?")) {
        return;
    }

    products = products.filter(p =>
        String(p.id) !== String(id)
    );

    saveData();
    renderApplication();
}

// ========================================
// SALES MANAGEMENT
// ========================================

$("salesForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const productId = $("saleProduct").value;
    const quantity = Number($("saleQuantity").value);

    const product = products.find(p =>
        String(p.id) === String(productId)
    );

    if (!product) {
        alert("Please select a valid product.");
        return;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
        alert("Enter a valid quantity.");
        return;
    }

    if (quantity > product.stock) {
        alert("Insufficient stock. Available stock: " + product.stock);
        return;
    }

    product.stock -= quantity;

    sales.push({
        pid: product.id,
        name: product.name,
        qty: quantity,
        price: product.price,
        date: new Date().toISOString()
    });

    saveData();

    this.reset();

    $("message").textContent = "Sale recorded successfully!";
    $("message").style.color = "green";

    renderApplication();
});

// ========================================
// DASHBOARD
// ========================================

function renderDashboard() {
    const revenue = sales.reduce((total, sale) => {
        return total +
            (Number(sale.qty) || 0) *
            (Number(sale.price) || 0);
    }, 0);

    const units = sales.reduce((total, sale) => {
        return total + (Number(sale.qty) || 0);
    }, 0);

    $("revenue").textContent = money(revenue);
    $("units").textContent = units;
    $("productCount").textContent = products.length;
    $("transactions").textContent = sales.length;
}

// ========================================
// PRODUCT TABLE
// ========================================

function renderProducts() {
    $("productTable").innerHTML = products.map(p => {
        const sold = getProductUnits(p.id);

        return `
            <tr>
                <td>${escapeHTML(p.name)}</td>
                <td>${money(p.price)}</td>
                <td>${p.stock}</td>
                <td>${sold}</td>
                <td>
                    <button onclick="deleteProduct(${Number(p.id)})">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    }).join("");

    const options = products.map(p => `
        <option value="${escapeHTML(p.id)}">
            ${escapeHTML(p.name)} - ${money(p.price)}
        </option>
    `).join("");

    $("saleProduct").innerHTML = options ||
        '<option value="">No products available</option>';

    $("predictionProduct").innerHTML = options ||
        '<option value="">No products available</option>';
}

// ========================================
// CHART
// ========================================

function renderChart() {
    const canvas = $("salesChart");

    if (!canvas || $("appContent").hidden) return;

    if (typeof Chart === "undefined") {
        console.error("Chart.js could not load.");
        return;
    }

    const labels = products.map(p => p.name);

    const values = products.map(p => {
        return getProductSales(p.id).reduce(
            (total, sale) =>
                total +
                (Number(sale.qty) || 0) *
                (Number(sale.price) || 0),
            0
        );
    });

    if (salesChart) {
        salesChart.destroy();
    }

    salesChart = new Chart(canvas, {
        type: "bar",

        data: {
            labels: labels,

            datasets: [{
                label: "Revenue (₹)",
                data: values,
                backgroundColor: "#2563eb",
                borderRadius: 7,
                maxBarThickness: 60
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: true
                }
            },

            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => "₹" +
                            Number(value).toLocaleString("en-IN")
                    }
                }
            }
        }
    });
}

// ========================================
// SALES HISTORY
// ========================================

function renderHistory() {
    const search = $("searchSales").value.toLowerCase();

    const filtered = [...sales].reverse().filter(s =>
        s.name.toLowerCase().includes(search)
    );

    $("salesTable").innerHTML = filtered.map(s => {
        const revenue = s.qty * s.price;

        const date = new Date(s.date);

        return `
            <tr>
                <td>${escapeHTML(
                    Number.isNaN(date.getTime())
                        ? "Unknown date"
                        : date.toLocaleString()
                )}</td>
                <td>${escapeHTML(s.name)}</td>
                <td>${s.qty}</td>
                <td>${money(s.price)}</td>
                <td>${money(revenue)}</td>
            </tr>
        `;
    }).join("");

    if (filtered.length === 0) {
        $("salesTable").innerHTML =
            '<tr><td colspan="5">No sales records found.</td></tr>';
    }
}

$("searchSales").addEventListener("input", renderHistory);

// ========================================
// SALES PREDICTION
// ========================================

$("predictionForm").addEventListener("submit", function(event) {
    event.preventDefault();

    const id = $("predictionProduct").value;
    const days = Number($("predictionDays").value);

    const product = products.find(p =>
        String(p.id) === String(id)
    );

    if (!product) {
        alert("Please select a product.");
        return;
    }

    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    const recentSales = getProductSales(product.id).filter(s => {
        const time = new Date(s.date).getTime();

        return Number.isFinite(time) &&
            time <= now &&
            now - time <= thirtyDays;
    });

    const unitsSold = recentSales.reduce(
        (total, sale) => total + sale.qty,
        0
    );

    const predictedUnits = Math.round(
        (unitsSold / 30) * days
    );

    const predictedRevenue =
        predictedUnits * product.price;

    $("predictionResult").innerHTML = `
        <h3>Prediction Results</h3>
        <p>Product: <strong>${escapeHTML(product.name)}</strong></p>
        <p>Period: ${days} Days</p>
        <p>Units Sold in Last 30 Days: ${unitsSold}</p>
        <p>Predicted Sales: <strong>${predictedUnits} Units</strong></p>
        <p>Estimated Revenue: <strong>${money(predictedRevenue)}</strong></p>
        <small>Estimate based on average sales over the last 30 days.</small>
    `;
});

// ========================================
// APPLICATION RENDER
// ========================================

function renderApplication() {
    renderDashboard();
    renderProducts();
    renderHistory();
    renderChart();
}

// ========================================
// START APPLICATION
// ========================================

loadData();

if (sessionStorage.getItem("salespilot_logged_in") === "yes") {
    showApplication();
} else {
    showLogin();
}

window.addEventListener("resize", function() {
    if (!$("appContent").hidden) {
        if (salesChart) {
            salesChart.resize();
        }
    }
});
