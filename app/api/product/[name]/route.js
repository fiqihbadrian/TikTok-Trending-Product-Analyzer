const { NextResponse } = require('next/server');
const { getProductDailySales } = require('../../../../lib/sales-service');

function hasDbEnv() {
  return (
    Boolean(process.env.DB_HOST) &&
    Boolean(process.env.DB_USER) &&
    Boolean(process.env.DB_NAME)
  );
}

async function GET(request, { params }) {
  try {
    if (!hasDbEnv()) {
      return NextResponse.json({
        success: true,
        product_name: '',
        data: [],
        message: 'Database environment variables are not configured yet.',
      });
    }

    const productName = decodeURIComponent(params.name || '');

    if (!productName) {
      return NextResponse.json(
        { success: false, message: 'Product name is required' },
        { status: 400 }
      );
    }

    const data = await getProductDailySales(productName, 30);
    return NextResponse.json({
      success: true,
      product_name: productName,
      data,
    });
  } catch (error) {
    console.error('Error fetching product detail:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch product detail' },
      { status: 500 }
    );
  }
}

module.exports = {
  GET,
};
