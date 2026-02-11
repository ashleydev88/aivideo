import asyncio
import sys
import os

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.services.logic_extraction import logic_extractor

async def main():
    print("🧪 Testing Logic Extractor Chart Prompts...")
    
    # Test case: Process Flow
    text = """
    To bake a cake:
    1. Preheat the oven to 350F.
    2. Mix dry ingredients (flour, sugar, baking powder).
    3. Mix wet ingredients (eggs, milk, oil).
    4. Combine wet and dry ingredients.
    5. Pour into a pan and bake for 30 minutes.
    """
    
    print(f"\n📝 Input Text:\n{text.strip()}\n")
    
    try:
        graph = await logic_extractor.extract_from_text(text)
        
        print(f"✅ Extracted Graph: {graph.archetype}")
        print(f"   Nodes: {len(graph.nodes)}")
        
        missing_descriptions = []
        for node in graph.nodes:
            desc = node.data.description
            print(f"   - Node '{node.data.label}': {desc}")
            
            if not desc or desc.strip() == "" or desc == node.data.label:
                missing_descriptions.append(node.data.label)
        
        if missing_descriptions:
            print(f"\n❌ FAIL: Missing or duplicate descriptions for: {missing_descriptions}")
            sys.exit(1)
        else:
            print("\n✅ PASS: All nodes have valid descriptions.")
            
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
