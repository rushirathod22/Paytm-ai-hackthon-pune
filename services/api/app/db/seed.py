import asyncio
from datetime import datetime, date, timezone
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from services.api.app.db.session import AsyncSessionLocal, engine, Base
from services.api.app.db.models import (
    User, Merchant, MerchantUser, Transaction, SettlementBatch, SettlementEntry,
    SupportCase, CaseEvent, Conversation, Message, Approval, AuditEvent, get_utc_now
)
from services.api.app.core.auth import get_password_hash

async def seed_data():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Check if already seeded
        res = await session.execute(select(Merchant).filter(Merchant.display_name == "Sharma Sweets & Chaat"))
        existing_merchant = res.scalars().first()
        if existing_merchant:
            print("Database already seeded with demo scenario.")
            return

        print("Seeding database with Golden Hackathon Scenario...")

        # 1. Users
        merchant_user = User(
            email="sharma.sweets@demo.com",
            name="Rajesh Sharma",
            role="MERCHANT",
            hashed_password=get_password_hash("demo123")
        )
        support_user = User(
            email="agent.rahul@paytmops.com",
            name="Rahul Verma (Support)",
            role="SUPPORT_AGENT",
            hashed_password=get_password_hash("demo123")
        )
        supervisor_user = User(
            email="supervisor.priya@paytmops.com",
            name="Priya Iyer (Supervisor)",
            role="SUPERVISOR",
            hashed_password=get_password_hash("demo123")
        )
        session.add_all([merchant_user, support_user, supervisor_user])
        await session.flush()

        # 2. Merchant
        merchant = Merchant(
            external_mid="PAYTM_STAGE_MID_8819",
            display_name="Sharma Sweets & Chaat",
            masked_phone="+91 9545696585",
            status="ACTIVE"
        )
        session.add(merchant)
        await session.flush()

        # Link merchant to user
        m_user_link = MerchantUser(
            user_id=merchant_user.id,
            merchant_id=merchant.id,
            role="OWNER"
        )
        session.add(m_user_link)

        # 3. Seed Transactions
        # Txn 1: ₹5,000 (Settled)
        txn1 = Transaction(
            merchant_id=merchant.id,
            provider="PAYTM",
            provider_txn_id="PTM_TXN_991201",
            order_id="ORD-8819",
            amount=Decimal("5000.00"),
            fee=Decimal("0.00"),
            tax=Decimal("0.00"),
            status="SUCCESS",
            txn_time=datetime(2026, 11, 14, 10, 15, 0, tzinfo=timezone.utc),
            source_type="SYNTHETIC_DEMO"
        )
        # Txn 2: ₹4,000 (Settled)
        txn2 = Transaction(
            merchant_id=merchant.id,
            provider="PAYTM",
            provider_txn_id="PTM_TXN_991202",
            order_id="ORD-8820",
            amount=Decimal("4000.00"),
            fee=Decimal("0.00"),
            tax=Decimal("0.00"),
            status="SUCCESS",
            txn_time=datetime(2026, 11, 14, 11, 30, 0, tzinfo=timezone.utc),
            source_type="SYNTHETIC_DEMO"
        )
        # Txn 3: ₹6,000 (Captured via Paytm UPI, but MISSING in Settlement Ledger!)
        txn3 = Transaction(
            merchant_id=merchant.id,
            provider="PAYTM",
            provider_txn_id="PTM_TXN_991203",
            order_id="ORD-8821",
            amount=Decimal("6000.00"),
            fee=Decimal("0.00"),
            tax=Decimal("0.00"),
            status="SUCCESS",
            txn_time=datetime(2026, 11, 14, 14, 45, 0, tzinfo=timezone.utc),
            source_type="SYNTHETIC_DEMO"
        )
        session.add_all([txn1, txn2, txn3])
        await session.flush()

        # 4. Settlement Batch (Observed = ₹9,000, Expected = ₹15,000 -> ₹6,000 Discrepancy)
        batch = SettlementBatch(
            merchant_id=merchant.id,
            batch_ref="BATCH-2026-1114-01",
            date=date(2026, 11, 14),
            gross=Decimal("9000.00"),
            fees=Decimal("0.00"),
            refunds=Decimal("0.00"),
            net=Decimal("9000.00"),
            status="SETTLED",
            source_type="SYNTHETIC_DEMO"
        )
        session.add(batch)
        await session.flush()

        entry1 = SettlementEntry(
            batch_id=batch.id,
            transaction_id=txn1.id,
            amount=Decimal("5000.00"),
            entry_type="PAYMENT",
            status="SETTLED",
            source_type="SYNTHETIC_DEMO"
        )
        entry2 = SettlementEntry(
            batch_id=batch.id,
            transaction_id=txn2.id,
            amount=Decimal("4000.00"),
            entry_type="PAYMENT",
            status="SETTLED",
            source_type="SYNTHETIC_DEMO"
        )
        session.add_all([entry1, entry2])

        # 5. Initial Audit Entry
        audit = AuditEvent(
            actor="SYSTEM_SEED",
            action="INITIALIZE_DEMO_SCENARIO",
            resource="MERCHANT_LEDGER",
            trace_id="seed-trace-001",
            details={
                "merchant": "Sharma Sweets & Chaat",
                "gross_captured": 15000.0,
                "settled_batch": 9000.0,
                "missing_settlement_order": "ORD-8821",
                "missing_amount": 6000.0
            }
        )
        session.add(audit)

        await session.commit()
        print("Successfully seeded Sharma Sweets with ₹15,000 captures and ₹9,000 settled batch!")

if __name__ == "__main__":
    asyncio.run(seed_data())
