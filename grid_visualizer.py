import matplotlib.pyplot as plt
import matplotlib.patches as patches
import numpy as np
import json
from smartroute_grid import SmartRouteGrid, RoadQuality
import folium
from folium import plugins

def visualize_grid_matplotlib(grid_data):
    """Visualize the grid using matplotlib"""
    fig, ax = plt.subplots(figsize=(12, 10))
    
    # Create grid
    grid_size = grid_data['grid_size']
    cells = grid_data['cells']
    
    # Color mapping
    color_map = {
        'Good': '#22c55e',
        'Satisfactory': '#f97316', 
        'Poor': '#ef4444',
        'Very Poor': '#8b4513',
        'Unknown': '#6b7280'
    }
    
    # Plot each cell
    for cell in cells:
        row = cell['row']
        col = cell['col']
        lat_bounds = cell['lat_bounds']
        lng_bounds = cell['lng_bounds']
        quality = cell['quality']
        
        # Create rectangle
        rect = patches.Rectangle(
            (lng_bounds[0], lat_bounds[0]),
            lng_bounds[1] - lng_bounds[0],
            lat_bounds[1] - lat_bounds[0],
            linewidth=1,
            edgecolor='black',
            facecolor=color_map.get(quality, '#6b7280'),
            alpha=0.7
        )
        ax.add_patch(rect)
        
        # Add quality label
        ax.text(
            (lng_bounds[0] + lng_bounds[1]) / 2,
            (lat_bounds[0] + lat_bounds[1]) / 2,
            quality[:3],
            ha='center',
            va='center',
            fontsize=8,
            fontweight='bold',
            color='white'
        )
    
    # Set limits and labels
    ax.set_xlim(grid_data['delhi_bounds']['lng_min'], grid_data['delhi_bounds']['lng_max'])
    ax.set_ylim(grid_data['delhi_bounds']['lat_min'], grid_data['delhi_bounds']['lat_max'])
    ax.set_xlabel('Longitude')
    ax.set_ylabel('Latitude')
    ax.set_title('SmartRoute AI - Delhi NCR Grid (20x20)\nRoad Quality Distribution', fontsize=14, fontweight='bold')
    
    # Add legend
    legend_elements = [
        patches.Patch(color=color_map['Good'], label='Good'),
        patches.Patch(color=color_map['Satisfactory'], label='Satisfactory'),
        patches.Patch(color=color_map['Poor'], label='Poor'),
        patches.Patch(color=color_map['Very Poor'], label='Very Poor')
    ]
    ax.legend(handles=legend_elements, loc='upper right')
    
    plt.tight_layout()
    plt.savefig('grid_visualization.png', dpi=300, bbox_inches='tight')
    plt.show()

def visualize_grid_folium(grid_data, route_data=None):
    """Visualize the grid using folium (interactive map)"""
    # Calculate center of Delhi NCR
    center_lat = (grid_data['delhi_bounds']['lat_min'] + grid_data['delhi_bounds']['lat_max']) / 2
    center_lng = (grid_data['delhi_bounds']['lng_min'] + grid_data['delhi_bounds']['lng_max']) / 2
    
    # Create map
    m = folium.Map(
        location=[center_lat, center_lng],
        zoom_start=11,
        tiles='cartodbpositron'
    )
    
    # Color mapping
    color_map = {
        'Good': '#22c55e',
        'Satisfactory': '#f97316',
        'Poor': '#ef4444',
        'Very Poor': '#8b4513',
        'Unknown': '#6b7280'
    }
    
    # Add grid cells
    for cell in grid_data['cells']:
        lat_bounds = cell['lat_bounds']
        lng_bounds = cell['lng_bounds']
        quality = cell['quality']
        
        # Create rectangle coordinates
        rect_coords = [
            [lat_bounds[0], lng_bounds[0]],
            [lat_bounds[0], lng_bounds[1]],
            [lat_bounds[1], lng_bounds[1]],
            [lat_bounds[1], lng_bounds[0]],
            [lat_bounds[0], lng_bounds[0]]
        ]
        
        # Add rectangle to map
        folium.Polygon(
            locations=rect_coords,
            color='black',
            weight=1,
            fill=True,
            fillColor=color_map.get(quality, '#6b7280'),
            fillOpacity=0.6,
            popup=f"Cell ({cell['row']}, {cell['col']})<br>Quality: {quality}"
        ).add_to(m)
    
    # Add route if provided
    if route_data and 'coordinates' in route_data:
        route_coords = route_data['coordinates']
        
        # Add route line
        folium.PolyLine(
            locations=route_coords,
            color='blue',
            weight=4,
            opacity=0.8,
            popup=f"Route: {route_data.get('distance', 0):.1f} km, {route_data.get('duration', 0):.1f} min"
        ).add_to(m)
        
        # Add start and end markers
        if len(route_coords) > 0:
            folium.Marker(
                route_coords[0],
                popup='Start',
                icon=folium.Icon(color='green', icon='info-sign')
            ).add_to(m)
            
            folium.Marker(
                route_coords[-1],
                popup='End',
                icon=folium.Icon(color='red', icon='info-sign')
            ).add_to(m)
    
    # Add legend
    legend_html = '''
    <div style="position: fixed; 
                bottom: 50px; left: 50px; width: 200px; height: 120px; 
                background-color: white; border:2px solid grey; z-index:9999; 
                font-size:14px; padding: 10px">
    <p><b>Road Quality</b></p>
    <p><i class="fa fa-square" style="color:#22c55e"></i> Good</p>
    <p><i class="fa fa-square" style="color:#f97316"></i> Satisfactory</p>
    <p><i class="fa fa-square" style="color:#ef4444"></i> Poor</p>
    <p><i class="fa fa-square" style="color:#8b4513"></i> Very Poor</p>
    </div>
    '''
    m.get_root().html.add_child(folium.Element(legend_html))
    
    return m

def demo_pathfinding():
    """Demonstrate pathfinding with visualization"""
    print("🚀 Creating SmartRoute AI Grid...")
    
    # Create grid
    grid = SmartRouteGrid(grid_size=20)
    grid_data = grid.export_grid_data()
    
    # Demo coordinates
    start_lat, start_lng = 28.6139, 77.2090  # Delhi center
    end_lat, end_lng = 28.7041, 77.1025      # Another point in Delhi
    
    print(f"📍 Finding path from ({start_lat}, {start_lng}) to ({end_lat}, {end_lng})")
    
    try:
        # Find cleanest path
        clean_path = grid.find_cleanest_path(start_lat, start_lng, end_lat, end_lng)
        print(f"✅ Clean path found with {len(clean_path)} cells")
        
        # Get route through clean path
        route_result = grid.get_route_through_clean_path(clean_path)
        
        if 'error' not in route_result:
            print(f"🚗 Route generated: {route_result['distance']:.1f} km, {route_result['duration']:.1f} min")
            
            # Create interactive map
            m = visualize_grid_folium(grid_data, route_result)
            m.save('smartroute_interactive_map.html')
            print("🗺️ Interactive map saved as 'smartroute_interactive_map.html'")
            
            # Create static visualization
            visualize_grid_matplotlib(grid_data)
            print("📊 Static visualization saved as 'grid_visualization.png'")
            
        else:
            print(f"❌ Route generation failed: {route_result['error']}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

def analyze_grid_statistics(grid_data):
    """Analyze and display grid statistics"""
    cells = grid_data['cells']
    
    # Count qualities
    quality_counts = {}
    for cell in cells:
        quality = cell['quality']
        quality_counts[quality] = quality_counts.get(quality, 0) + 1
    
    total_cells = len(cells)
    
    print("\n📊 Grid Statistics:")
    print("=" * 40)
    print(f"Total cells: {total_cells}")
    print(f"Grid size: {grid_data['grid_size']}x{grid_data['grid_size']}")
    print("\nQuality Distribution:")
    for quality, count in quality_counts.items():
        percentage = (count / total_cells) * 100
        print(f"  {quality}: {count} cells ({percentage:.1f}%)")
    
    # Calculate quality score
    quality_weights = {
        'Good': 100,
        'Satisfactory': 70,
        'Poor': 40,
        'Very Poor': 10,
        'Unknown': 50
    }
    
    total_score = sum(quality_counts.get(q, 0) * quality_weights[q] for q in quality_weights)
    average_score = total_score / total_cells
    
    print(f"\nOverall Quality Score: {average_score:.1f}/100")
    
    if average_score >= 80:
        print("🏆 Excellent road network!")
    elif average_score >= 60:
        print("👍 Good road network")
    elif average_score >= 40:
        print("⚠️ Moderate road network")
    else:
        print("🚧 Poor road network - needs improvement")

if __name__ == "__main__":
    print("🎯 SmartRoute AI Grid Visualizer")
    print("=" * 40)
    
    # Create and analyze grid
    grid = SmartRouteGrid(grid_size=20)
    grid_data = grid.export_grid_data()
    
    # Analyze statistics
    analyze_grid_statistics(grid_data)
    
    # Demo pathfinding with visualization
    demo_pathfinding()
    
    print("\n✅ Visualization complete! Check the generated files:")
    print("  - smartroute_interactive_map.html (interactive map)")
    print("  - grid_visualization.png (static visualization)")
    print("  - grid_data.json (grid data)")
