"""Generate daily learning articles using Claude."""

import os
import json
import logging
from datetime import datetime

import anthropic

from learning.curriculum import get_topic_for_date

logger = logging.getLogger(__name__)


async def generate_daily_article(sb):
    """Generate today's learning article and store it."""
    today = datetime.utcnow().strftime("%Y-%m-%d")

    # Check if already generated
    existing = sb.table("learning_articles").select("id").eq("date", today).execute()
    if existing.data:
        logger.info(f"Article already exists for {today}")
        return

    topic_data = get_topic_for_date(today)

    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    prompt = f"""Write a concise, engaging personal finance educational article.

Topic: {topic_data['topic']}
Week theme: {topic_data['theme']}

RULES:
- 400-600 words. Readable in 3-4 minutes.
- Write for someone who is smart but not a finance expert.
- Use concrete examples with real numbers.
- Include one "Key Takeaway" at the end — a single actionable sentence.
- Tone: direct, clear, zero jargon without explanation. Like explaining to a smart friend.
- Use markdown formatting (## for sections, **bold** for key terms, bullet points sparingly).
- Do NOT use generic filler phrases like "in today's world" or "it's important to note."

Return ONLY valid JSON with exactly these fields:
{{
    "title": "article title (catchy, under 60 chars)",
    "summary": "1-2 sentence hook (under 120 chars)",
    "content": "full article in markdown",
    "difficulty": "beginner" or "intermediate" or "advanced",
    "reading_time_minutes": 3 or 4 or 5
}}"""

    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )

    text = response.content[0].text.strip()
    # Strip markdown code fences if present
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
    if text.endswith("```"):
        text = text[:-3].strip()

    article_data = json.loads(text)

    sb.table("learning_articles").insert(
        {
            "date": today,
            "title": article_data["title"],
            "summary": article_data["summary"],
            "content": article_data["content"],
            "topic": topic_data["topic"],
            "week_number": topic_data["week_number"],
            "difficulty": article_data.get("difficulty", "beginner"),
            "reading_time_minutes": article_data.get("reading_time_minutes", 3),
            "further_reading": [],
        }
    ).execute()

    logger.info(f"Generated learning article for {today}: {article_data['title']}")
