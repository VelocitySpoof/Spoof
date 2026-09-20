<script>
  (function(){
    var input = document.getElementById('live-search-input-{{__id}}');
    var dropdown = document.getElementById('search-dropdown-{{__id}}');
    var resultsList = document.getElementById('search-results-list-{{__id}}');
    var viewAll = document.getElementById('search-view-all-{{__id}}');
    var productsPath = '/dsadsadsadsada';
    var debounceTimer;

    var PROXY_URL = 'https://spoof.raiyanmiahh.workers.dev';

    if (!input || !dropdown || !resultsList) return;

    function showDropdown() { dropdown.style.display = 'block'; }
    function hideDropdown() { dropdown.style.display = 'none'; }

    function getImageUrl(item) {
      // 1. Direct full URL provided
      var rawImg = item.image || item.cover || item.thumbnail || (item.images && item.images[0]);
      if (typeof rawImg === 'string' && rawImg.startsWith('http')) {
        return rawImg;
      }
      
      // 2. Relative path provided
      if (typeof rawImg === 'string' && rawImg.length > 0) {
        return rawImg.startsWith('/') ? ('https://cdn.komerza.com' + rawImg) : ('https://cdn.komerza.com/' + rawImg);
      }

      // 3. Construct URL from storeId, productId, and imageNames array
      var storeId = item.storeId || item.store_id;
      var productId = item.id || item._id;
      var imageName = (item.imageNames && item.imageNames[0]) || (item.images && item.images[0]);

      if (storeId && productId && imageName) {
        return 'https://cdn.komerza.com/stores/' + storeId + '/products/' + productId + '/' + imageName;
      }

      return '';
    }

    function renderResults(items, query) {
      if (items && items.length > 0) {
        resultsList.innerHTML = items.slice(0, 5).map(function(item){
          var url = item.slug ? ('/product/' + item.slug) : (item.id ? ('/product/' + item.id) : (item.url || productsPath));
          var title = item.name || item.title || 'Product';
          var img = getImageUrl(item);
          var price = item.price ? ('$' + item.price) : '';

          return '<a href="' + url + '" style="display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 8px; text-decoration: none; color: #fff; transition: background 0.2s;" onmouseover="this.style.background=\'rgba(255,255,255,0.1)\'" onmouseout="this.style.background=\'transparent\'">' +
            (img ? '<img src="' + img + '" style="width: 40px; height: 40px; object-fit: cover; border-radius: 6px; background: rgba(255,255,255,0.05); flex-shrink: 0;" onerror="this.outerHTML=\'<div style=\\&quot;width:40px;height:40px;border-radius:6px;background:rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;font-size:12px;\\&quot;>📦</div>\'">' : '<div style="width: 40px; height: 40px; border-radius: 6px; background: rgba(255,255,255,0.1); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 12px;">📦</div>') +
            '<div style="flex: 1; min-width: 0;">' +
              '<p style="margin: 0; font-size: 14px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #fff;">' + title + '</p>' +
              (price ? '<p style="margin: 2px 0 0 0; font-size: 12px; opacity: 0.7; font-weight: 600; color: #fff;">' + price + '</p>' : '') +
            '</div>' +
          '</a>';
        }).join('');

        if (viewAll) {
          viewAll.href = productsPath + '?q=' + encodeURIComponent(query);
          viewAll.style.display = 'block';
        }
      } else {
        resultsList.innerHTML = '<div style="padding: 16px; text-align: center; font-size: 14px; color: rgba(255,255,255,0.5);">No products found</div>';
        if (viewAll) viewAll.style.display = 'none';
      }
      showDropdown();
    }

    function doSearch(q) {
      fetch(PROXY_URL + '?q=' + encodeURIComponent(q))
        .then(function(res){ return res.json(); })
        .then(function(data){
          var rawProducts = Array.isArray(data) ? data : (data.data || data.products || []);
          renderResults(rawProducts, q);
        })
        .catch(function(){
          renderResults([], q);
        });
    }

    input.addEventListener('input', function(e) {
      var query = e.target.value.trim();
      clearTimeout(debounceTimer);

      if (query.length >= 2) {
        debounceTimer = setTimeout(function(){ doSearch(query); }, 200);
      } else {
        hideDropdown();
      }
    });

    document.addEventListener('click', function(e) {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        hideDropdown();
      }
    });

    input.addEventListener('focus', function() {
      if (input.value.trim().length >= 2) {
        doSearch(input.value.trim());
      }
    });
  })();
</script>
