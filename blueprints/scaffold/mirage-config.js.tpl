
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
      data: db.<%= collectionName %>.map(build<%= classifiedResourceName %>Data),
    };
  });

  this.post('/<%= resourcePath %>', function(db, request) {
    const attrs = JSON.parse(request.requestBody).data.attributes;
    const item = db.<%= collectionName %>.insert(attrs);
    return {
      data: build<%= classifiedResourceName %>Data(item),
    };
  });

  this.del('/<%= resourcePath %>/:id', function(db, request) {
    db.<%= collectionName %>.remove(request.params.id);
    return new Mirage.Response(204, {}, null);
  });

  this.patch('/<%= resourcePath %>/:id', function(db, request) {
    const attrs = JSON.parse(request.requestBody).data.attributes;
    const item = db.<%= collectionName %>.update(request.params.id, attrs);
    return {
      data: build<%= classifiedResourceName %>Data(item),
    };
  });
