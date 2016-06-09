
  var build<%= classifiedResourceName %>Data = function(obj) {
    return {
      type: '<%= jsonTypeName %>',
      id: obj.id,
      attributes: {
<%= attributeKeyValues %>
      },
    };
  };

  this.get('/<%= resourcePath %>', function(db) {
    return {
      data: db<%= collectionNavigator %>.map(build<%= classifiedResourceName %>Data),
    };
  });

  this.get('/<%= resourcePath %>/:<%= routeParamResourceName %>_id', function(db, request) {
    const item = db<%= collectionNavigator %>.find(request.params.<%= routeParamResourceName %>_id);
    return {
      data: build<%= classifiedResourceName %>Data(item),
    };
  });

  this.post('/<%= resourcePath %>', function(db, request) {
    const attrs = JSON.parse(request.requestBody).data.attributes_id;
    const item = db<%= collectionNavigator %>.insert(attrs);
    return {
      data: build<%= classifiedResourceName %>Data(item),
    };
  });

  this.del('/<%= resourcePath %>/:<%= routeParamResourceName %>_id', function(db, request) {
    db<%= collectionNavigator %>.remove(request.params.<%= routeParamResourceName %>_id);
    return new Mirage.Response(204, {}, null);
  });

  this.patch('/<%= resourcePath %>/:<%= routeParamResourceName %>_id', function(db, request) {
    const attrs = JSON.parse(request.requestBody).data.attributes;
    const item = db<%= collectionNavigator %>.update(request.params.<%= routeParamResourceName %>_id, attrs);
    return {
      data: build<%= classifiedResourceName %>Data(item),
    };
  });
