const { NextResponse } = require('next/server');
const { getTopProductsThisMonth } = require('../../../lib/sales-service');

function hasDbEnv() {
  return (
    Boolean(process.env.DB_HOST) &&
    Boolean(process.env.DB_USER) &&
    Boolean(process.env.DB_NAME)
  );
}

async function GET() {
  try {
    if (!hasDbEnv()) {
      return NextResponse.json({
        success: true,
        updated_at: new Date().toISOString(),
        data: [],
        message: 'Database environment variables are not configured yet.',
      });
    }

    const data = await getTopProductsThisMonth(10);
    return NextResponse.json({
      success: true,
      updated_at: new Date().toISOString(),
      data,
    });
  } catch (error) {
    console.error('Error fetching top-month:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch monthly top sales' },
      { status: 500 }
    );
  }
}

module.exports = {
  GET,
};
